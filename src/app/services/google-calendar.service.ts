import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup } from '@angular/fire/auth';
import moment from 'moment';
import { firstValueFrom, take } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CalendarEvent, EventSource } from 'src/models/calendar-event';
import { Constants } from 'src/models/constants';
import { EventService } from './event.service';

export interface GoogleSyncResult {
  // App -> Google
  pushedNew: number;
  pushedUpdated: number;
  // Google -> app
  pulledNew: number;
  pulledUpdated: number;
  // Removed locally because they are gone from Google
  deleted: number;
  failed: number;
}

/** The subset of the Google Calendar event resource this app reads. */
interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurrence?: string[];
  recurringEventId?: string;
  organizer?: { displayName?: string; email?: string };
  creator?: { displayName?: string; email?: string };
  extendedProperties?: { private?: { piaskEventId?: string } };
}

interface GoogleEventList {
  items?: GoogleEvent[];
  nextPageToken?: string;
}

// Only events near today are synced, so a first run cannot pull or push years of history.
const SYNC_PAST_DAYS = 30;
const SYNC_FUTURE_DAYS = 365;
// Timed events have no end-time field in the UI, so pushed ones get a default duration.
const DEFAULT_DURATION_HOURS = 1;
const PAGE_SIZE = 250;
// Bounds the paging loop so a malformed nextPageToken cannot spin forever.
const MAX_PAGES = 20;

/**
 * Two-way sync between the app and the shared family Google calendar
 * (`environment.googleCalendarId`), with per-event ownership rather than merging:
 *
 *  - Events created in the app (source App) are pushed to Google. Edits made to them in
 *    Google are overwritten on the next sync.
 *  - Events created in Google (source Google) are pulled into the app and are read-only
 *    here, so an app edit can never be lost to an overwrite.
 *
 * Because each event only ever moves one way, the two copies never need to be merged and
 * there is no conflict rule to get wrong.
 *
 * A deletion in Google removes the event from the app, whichever side created it.
 * Recurring events are skipped entirely - the app model has no notion of recurrence - but
 * they still count as "seen", so skipping one never causes it to be deleted locally.
 *
 * Known limits of doing this without a backend:
 *  - No background or automatic sync. The OAuth access token lives in a field here,
 *    expires in about an hour, and the Firebase Web SDK issues no refresh token to the
 *    browser, so every sync after a page reload costs one consent popup.
 *  - Nothing happens until somebody presses the button.
 *  - Only events inside the sync window are considered, in either direction.
 */
@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private auth: Auth,
    private http: HttpClient,
    private eventService: EventService
  ) {}

  get isConfigured(): boolean {
    return !!environment.googleCalendarId;
  }

  hasToken(): boolean {
    return !!this.accessToken && Date.now() < this.tokenExpiresAt;
  }

  async sync(): Promise<GoogleSyncResult> {
    if (!this.isConfigured) {
      throw new Error('Nie skonfigurowano kalendarza Google');
    }

    const token = await this.ensureAccessToken();
    if (!token) throw new Error('Brak dostępu do kalendarza Google');

    const result: GoogleSyncResult = {
      pushedNew: 0,
      pushedUpdated: 0,
      pulledNew: 0,
      pulledUpdated: 0,
      deleted: 0,
      failed: 0,
    };

    // Fetching first means an event created in the app and already pushed is matched by
    // its stored googleEventId, so it is never re-imported as a second copy.
    const remote = await this.withRetry((t) => this.fetchRemoteEvents(t));
    const local = await this.loadLocalEvents();

    await this.pullFromGoogle(remote, local, result);
    await this.deleteVanished(remote, local, result);
    await this.pushToGoogle(local, result);

    return result;
  }

  // ---------------------------------------------------------------- pull

  private async pullFromGoogle(
    remote: GoogleEvent[],
    local: CalendarEvent[],
    result: GoogleSyncResult
  ): Promise<void> {
    const byGoogleId = new Map<string, CalendarEvent>();
    const byLocalId = new Map<string, CalendarEvent>();
    for (const event of local) {
      if (event.googleEventId) byGoogleId.set(event.googleEventId, event);
      if (event.id) byLocalId.set(event.id, event);
    }

    for (const googleEvent of remote) {
      if (this.isSkippable(googleEvent)) continue;

      try {
        // The stamp we put on events we pushed is a second matching key, for the case
        // where an insert succeeded but writing googleEventId back to Firestore did not.
        const stampedId = googleEvent.extendedProperties?.private?.piaskEventId;
        const match =
          byGoogleId.get(googleEvent.id) ??
          (stampedId ? byLocalId.get(stampedId) : undefined);

        if (!match) {
          await this.importEvent(googleEvent);
          result.pulledNew++;
          continue;
        }

        // The app owns its own events, so a Google-side edit to one is ignored here and
        // overwritten by the push phase.
        if (!this.eventService.isFromGoogle(match)) {
          if (!match.googleEventId) {
            await this.eventService.setGoogleSync(match.id, googleEvent.id);
          }
          continue;
        }

        const changes = this.toCalendarEvent(googleEvent);
        if (this.hasChanged(match, changes)) {
          await this.eventService.applyGoogleUpdate(match.id, changes);
          result.pulledUpdated++;
        }
      } catch (error) {
        result.failed++;
      }
    }
  }

  private async importEvent(googleEvent: GoogleEvent): Promise<void> {
    const mapped = this.toCalendarEvent(googleEvent);
    await this.eventService.add({
      ...mapped,
      createdDate: new Date(),
      updatedDate: new Date(),
      // There is no app user behind a Google-created event.
      ownerUid: '',
      source: EventSource.Google,
      googleEventId: googleEvent.id,
      googleSyncedDate: new Date(),
    } as CalendarEvent);
  }

  private hasChanged(
    local: CalendarEvent,
    changes: Pick<
      CalendarEvent,
      'description' | 'date' | 'endDate' | 'time' | 'owner'
    >
  ): boolean {
    return (
      local.description !== changes.description ||
      local.owner !== changes.owner ||
      (local.time ?? null) !== (changes.time ?? null) ||
      this.eventService.dayKey(local.date) !==
        this.eventService.dayKey(changes.date) ||
      this.dayKeyOrNull(local.endDate) !== this.dayKeyOrNull(changes.endDate)
    );
  }

  private dayKeyOrNull(date: Date | null | undefined): string | null {
    return date ? this.eventService.dayKey(date) : null;
  }

  /** Maps a Google event onto the app's UTC-midnight day plus optional 'HH:mm' shape. */
  private toCalendarEvent(
    googleEvent: GoogleEvent
  ): Pick<
    CalendarEvent,
    'description' | 'date' | 'endDate' | 'time' | 'owner'
  > {
    const owner =
      googleEvent.organizer?.displayName ??
      googleEvent.creator?.displayName ??
      googleEvent.organizer?.email ??
      'Google';
    const description = googleEvent.summary?.trim() || '(bez nazwy)';

    if (googleEvent.start?.date) {
      // All-day. Google's end.date is exclusive, so the last covered day is one back.
      const startDay = googleEvent.start.date;
      const endExclusive = googleEvent.end?.date ?? startDay;
      const lastDay = moment
        .utc(endExclusive)
        .subtract(1, 'day')
        .format('YYYY-MM-DD');

      return {
        description,
        owner,
        date: moment.utc(startDay).toDate(),
        endDate:
          lastDay > startDay ? moment.utc(lastDay).toDate() : null,
        time: null,
      };
    }

    // Timed. parseZone keeps the offset Google sent, which is the calendar's own zone,
    // so formatting gives the wall-clock day and time the event actually reads as -
    // no timezone database needed on our side.
    const start = moment.parseZone(googleEvent.start?.dateTime);
    const startDay = start.format('YYYY-MM-DD');
    const endDay = googleEvent.end?.dateTime
      ? moment.parseZone(googleEvent.end.dateTime).format('YYYY-MM-DD')
      : startDay;

    return {
      description,
      owner,
      date: moment.utc(startDay).toDate(),
      endDate: endDay > startDay ? moment.utc(endDay).toDate() : null,
      time: start.format('HH:mm'),
    };
  }

  // ---------------------------------------------------------------- delete

  private async deleteVanished(
    remote: GoogleEvent[],
    local: CalendarEvent[],
    result: GoogleSyncResult
  ): Promise<void> {
    // Recurring events are counted as seen even though they are never imported, so that
    // skipping one is never mistaken for it having been deleted in Google.
    const seen = new Set<string>();
    for (const googleEvent of remote) {
      if (googleEvent.status !== 'cancelled') seen.add(googleEvent.id);
    }

    for (const event of local) {
      // Only events that were once synced and sit inside the window we just fetched can
      // be judged missing - anything else was simply never in the response.
      if (!event.googleEventId) continue;
      if (!this.isInWindow(event)) continue;
      if (seen.has(event.googleEventId)) continue;

      try {
        await this.eventService.delete(event.id);
        result.deleted++;
      } catch (error) {
        result.failed++;
      }
    }
  }

  // ---------------------------------------------------------------- push

  private async pushToGoogle(
    local: CalendarEvent[],
    result: GoogleSyncResult
  ): Promise<void> {
    for (const event of local) {
      // Google owns its own events; pushing them back would fight the pull phase.
      if (this.eventService.isFromGoogle(event)) continue;
      if (!this.isInWindow(event)) continue;

      try {
        await this.withRetry((token) => this.pushEvent(event, token, result));
      } catch (error) {
        result.failed++;
      }
    }
  }

  private async pushEvent(
    event: CalendarEvent,
    token: string,
    result: GoogleSyncResult
  ): Promise<void> {
    if (!event.googleEventId) {
      const created = await this.insertEvent(token, event);
      await this.eventService.setGoogleSync(event.id, created.id);
      result.pushedNew++;
      return;
    }

    if (!this.isDirty(event)) return;

    try {
      await this.patchEvent(token, event.googleEventId, event);
      await this.eventService.setGoogleSync(event.id, event.googleEventId);
      result.pushedUpdated++;
    } catch (error) {
      // Gone from Google between the fetch and now. The delete phase owns that case, so
      // leave it alone rather than resurrecting an event the user just deleted.
      if (!this.isGone(error)) throw error;
    }
  }

  private isDirty(event: CalendarEvent): boolean {
    if (!event.googleSyncedDate) return true;
    if (!event.updatedDate) return false;
    return event.updatedDate.getTime() > event.googleSyncedDate.getTime();
  }

  // ---------------------------------------------------------------- shared

  private async loadLocalEvents(): Promise<CalendarEvent[]> {
    return firstValueFrom(this.eventService.getEvents().pipe(take(1)));
  }

  private isInWindow(event: CalendarEvent): boolean {
    const day = this.eventService.dayKey(event.date);
    return day >= this.windowStart && day <= this.windowEnd;
  }

  private get windowStart(): string {
    return moment.utc().subtract(SYNC_PAST_DAYS, 'days').format('YYYY-MM-DD');
  }

  private get windowEnd(): string {
    return moment.utc().add(SYNC_FUTURE_DAYS, 'days').format('YYYY-MM-DD');
  }

  private isSkippable(googleEvent: GoogleEvent): boolean {
    if (!googleEvent.id) return true;
    if (googleEvent.status === 'cancelled') return true;
    // The app model has no recurrence, so neither a series nor its instances are imported.
    if (googleEvent.recurrence?.length) return true;
    if (googleEvent.recurringEventId) return true;
    return false;
  }

  /**
   * Fetches the whole window, following pagination. Any failure propagates rather than
   * returning a partial list - a short read would look like a pile of Google-side
   * deletions and wipe local events.
   */
  private async fetchRemoteEvents(token: string): Promise<GoogleEvent[]> {
    const events: GoogleEvent[] = [];
    let pageToken: string | undefined;
    let pages = 0;

    do {
      let params = new HttpParams()
        .set('timeMin', moment.utc(this.windowStart).toISOString())
        .set('timeMax', moment.utc(this.windowEnd).add(1, 'day').toISOString())
        // Recurring events are skipped, so there is nothing to gain from expanding them.
        .set('singleEvents', 'false')
        .set('showDeleted', 'false')
        .set('maxResults', String(PAGE_SIZE));
      if (pageToken) params = params.set('pageToken', pageToken);

      const page = await firstValueFrom(
        this.http.get<GoogleEventList>(this.eventsUrl, {
          headers: this.headers(token),
          params,
        })
      );

      events.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
      pages++;

      // Bail rather than return a short list: the delete phase treats anything missing
      // from this response as deleted in Google, so a truncated read would wipe events.
      if (pageToken && pages >= MAX_PAGES) {
        throw new Error('Zbyt wiele wydarzeń w kalendarzu Google');
      }
    } while (pageToken);

    return events;
  }

  /** Runs an authenticated call, re-prompting once if the token was rejected mid-pass. */
  private async withRetry<T>(
    action: (token: string) => Promise<T>
  ): Promise<T> {
    const token = await this.ensureAccessToken();
    if (!token) throw new Error('Brak dostępu do kalendarza Google');

    try {
      return await action(token);
    } catch (error) {
      if (!this.isAuthFailure(error)) throw error;

      this.accessToken = null;
      this.tokenExpiresAt = 0;
      const fresh = await this.ensureAccessToken();
      if (!fresh) throw error;
      return action(fresh);
    }
  }

  private async ensureAccessToken(): Promise<string | null> {
    if (this.hasToken()) return this.accessToken;

    const provider = new GoogleAuthProvider();
    provider.addScope(Constants.GOOGLE_CALENDAR_SCOPE);
    // Pin the popup to the account already signed in, so a sync cannot silently write
    // to somebody else's Google account.
    const current = this.auth.currentUser;
    if (current?.email) {
      provider.setCustomParameters({ login_hint: current.email });
    }

    const result = await signInWithPopup(this.auth, provider);
    this.accessToken =
      GoogleAuthProvider.credentialFromResult(result)?.accessToken ?? null;
    // Google access tokens last about an hour. Expire ours early, and never persist it:
    // the Web SDK hands out no refresh token, so there is nothing durable to store.
    this.tokenExpiresAt = this.accessToken ? Date.now() + 50 * 60 * 1000 : 0;
    return this.accessToken;
  }

  private get eventsUrl(): string {
    // The calendar id contains '@' and must be encoded.
    return `${Constants.GOOGLE_CALENDAR_API}/${encodeURIComponent(
      environment.googleCalendarId
    )}/events`;
  }

  private insertEvent(
    token: string,
    event: CalendarEvent
  ): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.post<{ id: string }>(
        this.eventsUrl,
        this.toGoogleResource(event),
        { headers: this.headers(token) }
      )
    );
  }

  private patchEvent(
    token: string,
    googleEventId: string,
    event: CalendarEvent
  ): Promise<{ id: string }> {
    return firstValueFrom(
      this.http.patch<{ id: string }>(
        `${this.eventsUrl}/${encodeURIComponent(googleEventId)}`,
        this.toGoogleResource(event),
        { headers: this.headers(token) }
      )
    );
  }

  private toGoogleResource(event: CalendarEvent): Record<string, unknown> {
    const startDay = this.eventService.dayKey(event.date);
    const endDay = this.eventService.dayKey(this.eventService.lastDay(event));
    const base = {
      summary: event.description,
      description: `PiaskHome — dodał(a): ${event.owner}`,
      extendedProperties: { private: { piaskEventId: event.id } },
    };

    if (!event.time) {
      return {
        ...base,
        start: { date: startDay },
        // Google treats an all-day end.date as exclusive, so it is always one day past
        // the last covered day - single-day events included.
        end: { date: moment.utc(endDay).add(1, 'day').format('YYYY-MM-DD') },
      };
    }

    // Naive wall-clock strings plus an explicit zone: Google resolves the offset, so no
    // timezone arithmetic happens here and DST is not our problem.
    const startDateTime = `${startDay}T${event.time}:00`;
    const endDateTime = moment(`${endDay}T${event.time}:00`)
      .add(DEFAULT_DURATION_HOURS, 'hours')
      .format('YYYY-MM-DDTHH:mm:ss');

    return {
      ...base,
      start: { dateTime: startDateTime, timeZone: Constants.TIME_ZONE },
      end: { dateTime: endDateTime, timeZone: Constants.TIME_ZONE },
    };
  }

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private isAuthFailure(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 401 || error.status === 403)
    );
  }

  private isGone(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 404 || error.status === 410)
    );
  }
}

import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';
import moment from 'moment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CalendarEvent, EventSource } from 'src/models/calendar-event';
import { CollectionKey } from 'src/models/colletion-keys';
import { DateUtilityService } from './date-utility.service';

// Guard against a corrupt endDate producing an unbounded day expansion.
const MAX_EVENT_DAYS = 366;

@Injectable({
  providedIn: 'root',
})
export class EventService {
  constructor(
    private store: Firestore,
    private dateUtilityService: DateUtilityService
  ) {}

  // The whole collection is loaded at once, like TodoService. A month-range query would
  // need to know which month the calendar shows, and MatCalendar exposes no output for
  // month navigation - and this one listener also feeds the day dialog, the upcoming
  // list and the Google sync pass.
  getEvents(): Observable<CalendarEvent[]> {
    return collectionData<CalendarEvent>(
      collection(this.store, CollectionKey.Events) as any,
      { idField: 'id' }
    ).pipe(
      map((events) => events.map((e) => this.convertEvent(e))),
      map((events) => [...events].sort((a, b) => this.compareEvents(a, b)))
    );
  }

  add(event: CalendarEvent): Promise<string> {
    const { id, ...data } = event;
    return addDoc(collection(this.store, CollectionKey.Events), data).then(
      (ref) => ref.id
    );
  }

  update(event: CalendarEvent): Promise<void> {
    if (!event?.id) return Promise.resolve();
    // The sync fields are stripped: the dialog works on a copy taken before the last
    // sync may have run, so writing them back could clobber a fresh googleEventId.
    const { id, googleEventId, googleSyncedDate, ...data } = event;
    return updateDoc(doc(this.store, CollectionKey.Events, event.id), {
      ...data,
    });
  }

  delete(id: string): Promise<void> {
    if (!id) return Promise.resolve();
    return deleteDoc(doc(this.store, CollectionKey.Events, id));
  }

  // Deliberately writes only the sync fields. Touching updatedDate here would re-dirty
  // every event on every pass, so the sync would never converge.
  setGoogleSync(eventId: string, googleEventId: string): Promise<void> {
    if (!eventId) return Promise.resolve();
    return updateDoc(doc(this.store, CollectionKey.Events, eventId), {
      googleEventId,
      googleSyncedDate: new Date(),
    });
  }

  // Refreshes a Google-owned event from its remote copy. Separate from update() because
  // that one strips the sync fields to protect against stale dialog copies, and because
  // this must not bump updatedDate - Google owns these, so nothing here is a user edit.
  applyGoogleUpdate(
    eventId: string,
    changes: Pick<
      CalendarEvent,
      'description' | 'date' | 'endDate' | 'time' | 'owner'
    >
  ): Promise<void> {
    if (!eventId) return Promise.resolve();
    return updateDoc(doc(this.store, CollectionKey.Events, eventId), {
      ...changes,
      googleSyncedDate: new Date(),
    });
  }

  // Documents written before two-way sync carry no source and were all app-created.
  isFromGoogle(event: CalendarEvent): boolean {
    return event.source === EventSource.Google;
  }

  // Day identity everywhere in the feature is the UTC calendar day, so days can be
  // compared and bucketed as plain 'YYYY-MM-DD' strings with no timezone math.
  dayKey(date: Date): string {
    return moment.utc(date).format('YYYY-MM-DD');
  }

  lastDay(event: CalendarEvent): Date {
    return event.endDate ?? event.date;
  }

  // Every day the event covers, start..endDate inclusive.
  dayKeysFor(event: CalendarEvent): string[] {
    if (!event.date) return [];

    const start = moment.utc(event.date).startOf('day');
    const end = moment.utc(this.lastDay(event)).startOf('day');
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return [start.isValid() ? start.format('YYYY-MM-DD') : ''];
    }

    const keys: string[] = [];
    const cursor = start.clone();
    while (!cursor.isAfter(end) && keys.length < MAX_EVENT_DAYS) {
      keys.push(cursor.format('YYYY-MM-DD'));
      cursor.add(1, 'day');
    }
    return keys;
  }

  private convertEvent(event: CalendarEvent): CalendarEvent {
    if (event.date && !(event.date instanceof Date)) {
      event.date = this.dateUtilityService.getDateFromTimeStamp(event.date);
    }
    if (event.endDate && !(event.endDate instanceof Date)) {
      event.endDate = this.dateUtilityService.getDateFromTimeStamp(
        event.endDate
      );
    }
    if (event.createdDate && !(event.createdDate instanceof Date)) {
      event.createdDate = this.dateUtilityService.getDateFromTimeStamp(
        event.createdDate
      );
    }
    if (event.updatedDate && !(event.updatedDate instanceof Date)) {
      event.updatedDate = this.dateUtilityService.getDateFromTimeStamp(
        event.updatedDate
      );
    }
    if (event.googleSyncedDate && !(event.googleSyncedDate instanceof Date)) {
      event.googleSyncedDate = this.dateUtilityService.getDateFromTimeStamp(
        event.googleSyncedDate
      );
    }
    return event;
  }

  // Chronological: day, then time of day (all-day events lead), then description.
  private compareEvents(a: CalendarEvent, b: CalendarEvent): number {
    const dayDiff = this.dayKey(a.date).localeCompare(this.dayKey(b.date));
    if (dayDiff !== 0) return dayDiff;

    const timeDiff = (a.time ?? '').localeCompare(b.time ?? '');
    if (timeDiff !== 0) return timeDiff;

    return (a.description ?? '').localeCompare(b.description ?? '');
  }
}

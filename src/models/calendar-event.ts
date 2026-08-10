// Which side owns an event for its whole life. Sync is two-way overall, but each event
// only ever moves in one direction, so the two copies can never need merging.
export enum EventSource {
  // Created in the app: pushed to Google, and app edits overwrite the Google copy.
  App = 'app',
  // Created in Google Calendar: pulled into the app and read-only here.
  Google = 'google',
}

export interface CalendarEvent {
  id: string;
  description: string;
  // Start day, pinned to UTC midnight (the datepicker adapter runs with useUtc).
  date: Date;
  // Last day of a multi-day event, inclusive, also UTC midnight. null for single-day
  // events - a range that ends on the start day is normalized to null when saving.
  endDate?: Date | null;
  // Optional wall-clock start time as 'HH:mm'. null means an all-day event.
  // Kept separate from `date` so the day never shifts across timezones.
  time?: string | null;
  createdDate: Date;
  // Bumped on every user edit; drives the "dirty" check for Google sync.
  updatedDate: Date;
  ownerUid: string;
  owner: string;
  // Missing on documents written before two-way sync existed - those were all created
  // in the app, so treat an absent value as App.
  source?: EventSource | null;
  // Id of the mirrored event on the shared Google calendar. There is one shared
  // calendar for the whole family, so there is one remote copy per event: whoever
  // syncs first creates it, everyone else patches that same copy.
  googleEventId?: string | null;
  googleSyncedDate?: Date | null;
}

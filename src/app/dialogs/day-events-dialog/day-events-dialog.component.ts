import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CalendarEvent, EventSource } from 'src/models/calendar-event';

export interface DayEventsDialogData {
  // UTC-midnight day that was tapped.
  day: Date;
  // Events covering that day, already sorted by the parent.
  events: CalendarEvent[];
  canModify: boolean;
}

export type DayEventsDialogResult =
  | { action: 'add' }
  | { action: 'edit'; event: CalendarEvent }
  | { action: 'delete'; event: CalendarEvent };

// A pure router: it picks an event and an intent, and EventsComponent owns every
// Firestore write - the same split TodoComponent uses with its dialog.
@Component({
  selector: 'app-day-events-dialog',
  templateUrl: './day-events-dialog.component.html',
  styleUrls: ['./day-events-dialog.component.scss'],
  standalone: false,
})
export class DayEventsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DayEventsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DayEventsDialogData
  ) {}

  // True when the event covers more than the tapped day, so the row can show the span.
  isMultiDay(event: CalendarEvent): boolean {
    return !!event.endDate;
  }

  // Events created in Google Calendar are owned by Google: the app mirrors them, and
  // editing or deleting one here would just be undone by the next sync.
  isFromGoogle(event: CalendarEvent): boolean {
    return event.source === EventSource.Google;
  }

  canEdit(event: CalendarEvent): boolean {
    return this.data.canModify && !this.isFromGoogle(event);
  }

  add(): void {
    this.dialogRef.close({ action: 'add' } as DayEventsDialogResult);
  }

  edit(event: CalendarEvent): void {
    this.dialogRef.close({ action: 'edit', event } as DayEventsDialogResult);
  }

  delete(event: CalendarEvent): void {
    this.dialogRef.close({ action: 'delete', event } as DayEventsDialogResult);
  }
}

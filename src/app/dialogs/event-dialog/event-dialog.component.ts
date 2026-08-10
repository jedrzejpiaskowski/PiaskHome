import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import moment from 'moment';
import { CalendarEvent } from 'src/models/calendar-event';

export interface EventDialogData {
  event: CalendarEvent | null;
  // Day preselected when adding straight from a calendar cell (already UTC midnight).
  day: Date | null;
}

export type EventDialogResult =
  | { action: 'save'; event: CalendarEvent; createTodo: boolean }
  | { action: 'delete'; event: CalendarEvent };

@Component({
  selector: 'app-event-dialog',
  templateUrl: './event-dialog.component.html',
  styleUrls: ['./event-dialog.component.scss'],
  standalone: false,
})
export class EventDialogComponent {
  event: CalendarEvent;
  isEdit: boolean;
  // Bound to the datepickers; the moment adapter (useUtc) works in Moments, so the
  // days stay Moments here and become JS Dates only on save.
  startDate: moment.Moment | null = null;
  endDate: moment.Moment | null = null;
  // 'HH:mm' from a native time input - empty string means an all-day event.
  time = '';
  // Lives on the dialog result, never on the event: the todo it creates is an
  // independent copy and nothing links the two afterwards.
  createTodo = false;

  constructor(
    public dialogRef: MatDialogRef<EventDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EventDialogData
  ) {
    this.isEdit = !!data?.event;
    this.event = data?.event
      ? { ...data.event }
      : ({
          description: '',
          endDate: null,
          time: null,
        } as CalendarEvent);

    // data.day comes from a calendar cell and is already UTC midnight, so this
    // round-trips exactly.
    const start = this.event.date ?? data?.day ?? null;
    this.startDate = start ? moment.utc(start) : moment.utc(moment().format('YYYY-MM-DD'));
    this.endDate = this.event.endDate ? moment.utc(this.event.endDate) : null;
    this.time = this.event.time ?? '';
  }

  clearTime(): void {
    this.time = '';
  }

  clearEndDate(): void {
    this.endDate = null;
  }

  get isValid(): boolean {
    return (
      !!this.event.description &&
      this.event.description.trim().length > 0 &&
      !!this.startDate &&
      this.startDate.isValid() &&
      (!this.endDate ||
        (this.endDate.isValid() &&
          !this.endDate.isBefore(this.startDate, 'day'))) &&
      (!this.time || /^\d{2}:\d{2}$/.test(this.time))
    );
  }

  save(): void {
    if (!this.isValid) return;

    this.event.description = this.event.description.trim();
    this.event.date = this.startDate!.toDate();
    // A range ending on the start day is stored as null so a single-day event always
    // has exactly one shape.
    this.event.endDate =
      this.endDate && this.endDate.isAfter(this.startDate!, 'day')
        ? this.endDate.toDate()
        : null;
    this.event.time = this.time || null;

    this.dialogRef.close({
      action: 'save',
      event: this.event,
      createTodo: this.createTodo,
    } as EventDialogResult);
  }

  delete(): void {
    this.dialogRef.close({
      action: 'delete',
      event: this.event,
    } as EventDialogResult);
  }
}

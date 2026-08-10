import {
  AfterViewInit,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  MatCalendar,
  MatCalendarCellClassFunction,
} from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import moment from 'moment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import {
  DayEventsDialogComponent,
  DayEventsDialogResult,
} from 'src/app/dialogs/day-events-dialog/day-events-dialog.component';
import {
  EventDialogComponent,
  EventDialogResult,
} from 'src/app/dialogs/event-dialog/event-dialog.component';
import { CalendarEvent, EventSource } from 'src/models/calendar-event';
import { Todo, TodoPriority } from 'src/models/todo';
import { User } from 'src/models/user';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { GoogleCalendarService } from '../../services/google-calendar.service';
import { TodoService } from '../../services/todo.service';

// The upcoming list is a glance, not an archive.
const UPCOMING_LIMIT = 50;

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
  standalone: false,
})
export class EventsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatCalendar) private calendar?: MatCalendar<moment.Moment>;

  events$: Observable<CalendarEvent[]>;
  upcoming$: Observable<CalendarEvent[]>;
  user$: Observable<User | null | undefined>;
  // Hidden by default - the calendar is the main view.
  showUpcoming$ = new BehaviorSubject<boolean>(false);

  syncing = false;

  // Bridges the async events stream to dateClass, which the calendar calls
  // synchronously once per cell. Also serves the day tap, so a tap never rescans
  // the whole collection.
  private eventsByDay = new Map<string, CalendarEvent[]>();
  // Days covered by an event spanning more than one day, and days carrying at least one
  // single-day event. Kept apart so the two get different decorations: a continuous bar
  // for a span, a ring for a one-off.
  private spanDays = new Set<string>();
  private singleDays = new Set<string>();
  private sub = new Subscription();

  constructor(
    private eventService: EventService,
    private todoService: TodoService,
    private googleCalendar: GoogleCalendarService,
    private auth: AuthService,
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private title: Title
  ) {
    this.title.setTitle('Kalendarz');
    this.user$ = this.auth.user$;
    this.events$ = this.eventService.getEvents().pipe(shareReplay(1));

    this.upcoming$ = this.events$.pipe(
      map((events) => {
        const todayKey = moment.utc().format('YYYY-MM-DD');
        return events
          // Keying off the last covered day keeps an in-progress holiday in the list.
          .filter(
            (e) =>
              this.eventService.dayKey(this.eventService.lastDay(e)) >= todayKey
          )
          .slice(0, UPCOMING_LIMIT);
      })
    );
  }

  ngOnInit(): void {
    this.sub.add(
      this.events$.subscribe((events) => {
        this.eventsByDay = new Map<string, CalendarEvent[]>();
        this.spanDays = new Set<string>();
        this.singleDays = new Set<string>();
        for (const event of events) {
          // Multi-day events are expanded here, so every covered day is decorated.
          const keys = this.eventService.dayKeysFor(event);
          const isSpan = keys.length > 1;
          for (const key of keys) {
            const bucket = this.eventsByDay.get(key);
            if (bucket) {
              bucket.push(event);
            } else {
              this.eventsByDay.set(key, [event]);
            }
            if (isSpan) {
              this.spanDays.add(key);
            } else {
              this.singleDays.add(key);
            }
          }
        }
        // Rebuild the visible month so dateClass runs again against the new map.
        // Month navigation refreshes itself, only data changes need this.
        this.calendar?.updateTodaysDate();
      })
    );
  }

  ngAfterViewInit(): void {
    // Covers the race where the first Firestore emission lands before the calendar exists.
    this.calendar?.updateTodaysDate();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // The adapter runs with useUtc, so cellDate is a UTC-midnight Moment and formatting it
  // gives exactly the day shown in the cell.
  dateClass: MatCalendarCellClassFunction<moment.Moment> = (cellDate, view) => {
    if (view !== 'month') return '';

    const key = cellDate.format('YYYY-MM-DD');
    const count = this.eventsByDay.get(key)?.length ?? 0;
    if (count === 0) return '';

    // Anything past four collapses into the same "4+" badge.
    const classes = ['event-day', `event-count-${Math.min(count, 4)}`];

    if (this.singleDays.has(key)) {
      classes.push('event-single');
    }

    if (this.spanDays.has(key)) {
      classes.push('event-span');
      // Round the caps only where the run actually begins or ends, so that spans which
      // touch or overlap read as one continuous bar rather than several pills.
      const prev = cellDate.clone().subtract(1, 'day').format('YYYY-MM-DD');
      const next = cellDate.clone().add(1, 'day').format('YYYY-MM-DD');
      if (!this.spanDays.has(prev)) classes.push('event-span-start');
      if (!this.spanDays.has(next)) classes.push('event-span-end');
    }

    return classes.join(' ');
  };

  toggleUpcoming(): void {
    this.showUpcoming$.next(!this.showUpcoming$.getValue());
  }

  // The calendar's `selected` is deliberately left unbound: MatCalendar only emits
  // selectedChange when the tapped day differs from its current selection, so binding it
  // would make a second tap on the same day do nothing. Days are decorated by dateClass
  // anyway, and a dialog covers the calendar the moment a day is tapped.
  onDaySelected(day: moment.Moment | null, user: User | null | undefined): void {
    if (!day || !user) return;

    const dayEvents = this.eventsByDay.get(day.format('YYYY-MM-DD')) ?? [];
    if (dayEvents.length === 0) {
      // An empty day has nothing to list, so skip straight to the form.
      this.openEventDialog(null, day.toDate(), user);
    } else {
      this.openDayDialog(day.toDate(), dayEvents, user);
    }
  }

  openEventDialog(
    event: CalendarEvent | null,
    day: Date | null,
    user: User | null | undefined
  ): void {
    if (!user) return;

    const dialogRef = this.dialog.open(EventDialogComponent, {
      data: { event, day },
    });
    dialogRef.afterClosed().subscribe((result: EventDialogResult | null) => {
      if (!result) return;
      if (result.action === 'save') {
        this.handleSave(result.event, result.createTodo, user);
      } else if (result.action === 'delete') {
        this.confirmDelete(result.event);
      }
    });
  }

  confirmDelete(event: CalendarEvent): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: 'Czy na pewno chcesz usunąć wydarzenie?',
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.eventService.delete(event.id);
      }
    });
  }

  async syncGoogle(): Promise<void> {
    if (this.syncing) return;

    if (!this.googleCalendar.isConfigured) {
      this.notify('Nie skonfigurowano kalendarza Google', true);
      return;
    }

    this.syncing = true;
    try {
      const result = await this.googleCalendar.sync();
      const pushed = result.pushedNew + result.pushedUpdated;
      const pulled = result.pulledNew + result.pulledUpdated;
      const summary =
        `Wysłano: ${pushed} · Pobrano: ${pulled} · Usunięto: ${result.deleted}`;
      if (result.failed > 0) {
        this.notify(`${summary} · błędy: ${result.failed}`, true);
      } else {
        this.notify(summary);
      }
    } catch (error) {
      this.notify(this.syncErrorMessage(error), true);
    } finally {
      this.syncing = false;
    }
  }

  // Google owns the events it created, so the app shows them but never edits them -
  // an app edit would just be overwritten by the next pull.
  isFromGoogle(event: CalendarEvent): boolean {
    return this.eventService.isFromGoogle(event);
  }

  // Label for the upcoming list: "10.08 18:00" / "10.08–17.08".
  eventDateLabel(event: CalendarEvent): string {
    const start = moment.utc(event.date).format('DD.MM');
    if (event.endDate) {
      return `${start}–${moment.utc(event.endDate).format('DD.MM')}`;
    }
    return event.time ? `${start} ${event.time}` : start;
  }

  private openDayDialog(
    day: Date,
    events: CalendarEvent[],
    user: User
  ): void {
    const dialogRef = this.dialog.open(DayEventsDialogComponent, {
      data: { day, events, canModify: !!user },
    });
    dialogRef.afterClosed().subscribe((result: DayEventsDialogResult | null) => {
      if (!result) return;
      if (result.action === 'add') {
        this.openEventDialog(null, day, user);
      } else if (result.action === 'edit') {
        this.openEventDialog(result.event, day, user);
      } else if (result.action === 'delete') {
        this.confirmDelete(result.event);
      }
    });
  }

  private handleSave(
    event: CalendarEvent,
    createTodo: boolean,
    user: User
  ): void {
    if (!event.id) {
      this.eventService.add({
        ...event,
        createdDate: new Date(),
        updatedDate: new Date(),
        ownerUid: user.uid,
        owner: user.shortName ?? user.displayName ?? '',
        source: EventSource.App,
        googleEventId: null,
        googleSyncedDate: null,
      } as CalendarEvent);
    } else {
      this.eventService.update({ ...event, updatedDate: new Date() });
    }

    if (createTodo) {
      // An independent copy: nothing links it back to the event, so later edits and
      // deletes of the event never touch it.
      this.todoService.add({
        description: event.description,
        createdDate: new Date(),
        priority: TodoPriority.Standard,
        deadline: event.date,
        completed: false,
        shared: true,
        ownerUid: user.uid,
        owner: user.shortName ?? user.displayName ?? '',
      } as Todo);
    }
  }

  private syncErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    // The popup being dismissed is a normal outcome, not a failure worth shouting about.
    if (message.includes('popup-closed-by-user') || message.includes('cancelled-popup-request')) {
      return 'Synchronizacja anulowana';
    }
    return message || 'Synchronizacja nie powiodła się';
  }

  private notify(message: string, warning = false): void {
    this.snackbar.open(message, undefined, {
      duration: 3000,
      panelClass: [warning ? 'snackbar-warning' : 'snackbar-info'],
    });
  }
}

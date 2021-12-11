import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import * as moment from 'moment';
import { BehaviorSubject, combineLatest, Observable, of } from 'rxjs';
import { debounceTime, filter, map, switchMap, tap } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import { CollectionKey } from 'src/models/colletion-keys';
import { DaySummary, VisitEntry } from 'src/models/visit-entry';
import { DateUtilityService } from '../../services/date-utility.service';

@Component({
  selector: 'app-visits',
  templateUrl: './visits.component.html',
  styleUrls: ['./visits.component.scss'],
})
export class VisitsComponent implements OnInit {
  activeVisit$: Observable<VisitEntry>;
  visitsForDay$: Observable<VisitEntry[]>;
  visitsForMonth$: Observable<DaySummary[]>;
  selectedDate$ = new BehaviorSubject<Date | null>(new Date());
  selectedMonth$ = new BehaviorSubject<Date>(new Date());
  monthLabel = '';
  id$ = new BehaviorSubject<string | null>(null);
  percentage = 35;
  CollectionKey = CollectionKey.Visits;
  totalPrice = 0;
  totalEarnings = 0;

  totalMonthPrice = 0;
  totalMonthEarnings = 0;
  totalMonthVisits = 0;

  displayedColumns = ['id', 'patient', 'percentage', 'price', 'earnings'];
  displayedMonthColumns = ['day', 'visitsCount', 'price', 'earnings'];

  constructor(
    private store: AngularFirestore,
    private dateUtilityService: DateUtilityService,
    public dialog: MatDialog
  ) {
    this.activeVisit$ = combineLatest([this.id$, this.selectedDate$]).pipe(
      debounceTime(100),
      switchMap(([id, date]) => {
        if (id) {
          return this.store
            .collection<VisitEntry>(this.CollectionKey)
            .doc(id)
            .valueChanges({ idField: 'id' });
        }
        if (!date) {
          date = new Date();
        }
        return of({ date, percentage: this.percentage } as VisitEntry);
      }),
      map((visits) => this.convertVisit(visits as VisitEntry))
    );

    this.visitsForDay$ = this.selectedDate$.pipe(
      filter((date) => date !== null && date !== undefined),
      switchMap((d) => {
        if (!d) return of([] as VisitEntry[]);

        const startDate = new Date(d.toDateString());
        const endDate = new Date(d.toDateString());
        endDate.setDate(startDate.getDate() + 1);
        return this.store
          .collection<VisitEntry>(this.CollectionKey, (ref) =>
            ref
              .orderBy('date')
              .where('date', '>', startDate)
              .where('date', '<', endDate)
          )
          .valueChanges({ idField: 'id' });
      }),
      map((visits) => visits.map((v) => this.convertVisit(v))),
      tap((visits) => {
        this.totalPrice = visits
          .map((v) => v.price)
          .reduce((acc, value) => acc + value, 0);
        this.totalEarnings = visits
          .map((v) => v.earnings)
          .reduce((acc, value) => acc + value, 0);
      })
    );

    this.visitsForMonth$ = this.selectedMonth$.pipe(
      tap((_) => {
        this.totalMonthEarnings = 0;
        this.totalMonthPrice = 0;
        this.totalMonthVisits = 0;
      }),
      switchMap((d) => {
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        this.monthLabel = `${d.toLocaleString('default', {
          month: 'long',
        })} ${d.getFullYear()}`;
        return this.store
          .collection<VisitEntry>(this.CollectionKey, (ref) =>
            ref
              .orderBy('date')
              .where('date', '>', firstDay)
              .where('date', '<', lastDay)
          )
          .valueChanges({ idField: 'id' });
      }),
      map((visits) => {
        if (visits && visits.length > 0) {
          visits = visits.map((v) => this.convertVisit(v));
          return visits.reduce<DaySummary[]>((summary, visit) => {
            const day = new Date(visit.date.toDateString());
            const visitOccured = summary?.find(
              (v) => v.day.getTime() == day.getTime()
            );
            this.totalMonthEarnings += visit.earnings;
            this.totalMonthPrice += visit.price;
            this.totalMonthVisits++;
            if (visitOccured) {
              visitOccured.visitsCount++;
              visitOccured.price += visit.price;
              visitOccured.earnings += visit.earnings;
            } else {
              summary.push({
                visitsCount: 1,
                price: visit.price,
                earnings: visit.earnings,
                day: day,
              } as DaySummary);
            }
            return summary;
          }, []);
        }
        return [] as DaySummary[];
      })
    );
  }

  changeMonth(change: number) {
    const sm = this.selectedMonth$.getValue();
    this.selectedMonth$.next(
      new Date(sm.getFullYear(), sm.getMonth() + change, 1)
    );
  }

  showNextMonthArrow(): boolean {
    const cd = new Date();
    const sm = this.selectedMonth$.getValue();
    return sm.getFullYear() <= cd.getFullYear() && sm.getMonth() < cd.getMonth();
  }

  dateChanged(date: moment.Moment) {
    this.pickDate(date.toDate());
  }

  pickDate(date: Date) {
    this.id$.next(null);
    this.selectedDate$.next(date);
  }

  pickVisit(visit: VisitEntry) {
    this.id$.next(visit.id);
  }

  newVisit() {
    const sDate = this.selectedDate$.getValue();
    if (sDate) {
      this.pickDate(sDate);
    } else {
      this.pickDate(new Date());
    }
  }

  convertVisit(visit: VisitEntry): VisitEntry {
    if (visit.date && !(visit.date instanceof Date)) {
      visit.date = this.dateUtilityService.getDateFromTimeStamp(visit.date);
    }
    return visit;
  }

  getNewVisitEntry(): VisitEntry {
    return {
      date: new Date(),
    } as VisitEntry;
  }

  save(visit: VisitEntry) {
    if (!visit) return;

    visit.date = this.dateUtilityService.getDateWithDateTimeshift(visit.date);
    visit.saved = true;
    visit.earnings = (visit.price * visit.percentage) / 100;
    this.store.collection(this.CollectionKey).add(visit);
    this.newVisit();
  }

  update(visit: VisitEntry) {
    if (!visit) return;

    visit.earnings = (visit.price * visit.percentage) / 100;
    this.store.collection(this.CollectionKey).doc(visit.id).update(visit);
  }

  delete(visit: VisitEntry) {
    if (!visit) return;

    const confirmationDialogRef = this.dialog.open(
      ConfirmationDialogComponent,
      {
        data: 'Czy na pewno chcesz usunąć wizytę?',
      }
    );
    confirmationDialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.collection(this.CollectionKey).doc(visit.id).delete();
        this.newVisit();
      }
    });
  }

  ngOnInit(): void {}
}

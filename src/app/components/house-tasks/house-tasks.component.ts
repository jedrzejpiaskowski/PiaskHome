import { Component, OnInit } from '@angular/core';
import { HouseTasks } from 'src/models/house-task';
import { AngularFirestore, Query } from '@angular/fire/compat/firestore';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
} from 'rxjs';
import {
  debounceTime,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { CollectionKey } from 'src/models/colletion-keys';
import { User } from 'src/models/user';
import { Paging } from 'src/models/paging-mode';
import { DateUtilityService } from '../../services/date-utility.service';
import { multi } from './../../data/data';
import { ColorHelper } from '@swimlane/ngx-charts';

@Component({
  selector: 'app-house-tasks',
  templateUrl: './house-tasks.component.html',
  styleUrls: ['./house-tasks.component.scss'],
})
export class HouseTasksComponent {
  activeTasks$: Observable<HouseTasks>;
  tasksList$: Observable<HouseTasks[]>;
  today: string;
  yesterday: string;
  activeDate: string;
  activeDate$ = new BehaviorSubject(new Date().toLocaleDateString());
  activeUser$ = new BehaviorSubject<string | null | undefined>(null);
  paging$ = new BehaviorSubject<Paging>(Paging.None);
  whoFilter$ = new BehaviorSubject(null);
  pageSize = 8;
  first: HouseTasks | null = null;
  last: HouseTasks | null = null;
  pagingNone = Paging.None;
  pagingPrev = Paging.Previous;
  user$: Observable<User | null | undefined>;

  displayedColumns = [
    'who',
    'date',
    'approved',
  ];

  constructor(private store: AngularFirestore, private auth: AuthService, private dateUtilityService: DateUtilityService) {
    const date = new Date();
    this.today = date.toLocaleDateString();
    this.activeDate = this.today;
    date.setDate(date.getDate() - 1);
    this.yesterday = date.toLocaleDateString();
    this.user$ = this.auth.user$;

    this.tasksList$ = combineLatest([this.paging$, this.whoFilter$]).pipe(
      switchMap(([paging, who]) =>
        this.store
          .collection<HouseTasks>(CollectionKey.HouseTasks, (ref) => {
            let query:
              | firebase.default.firestore.CollectionReference
              | firebase.default.firestore.Query = ref;

            if (paging === Paging.Previous && this.last) {
              query = query.startAfter(this.last.date).limit(this.pageSize);
            } else if (paging === Paging.Next && this.first) {
              query = query
                .endBefore(this.first.date)
                .limitToLast(this.pageSize);
            } else {
              query = query.limit(this.pageSize);
            }
            return query;
          })
          .valueChanges({ idField: 'id' })
      ),
      map((t) => t.map((ht) => this.convertHouseTasks(ht))),
      tap((tasks) => {
        const f = tasks[0];
        if (f) {
          this.first = f;
        }
        const l = tasks[tasks.length - 1];
        if (l) {
          this.last = l;
        }
      })
    );

    this.activeTasks$ = combineLatest([
      this.activeDate$,
      this.auth.user$,
      this.activeUser$,
    ]).pipe(
      debounceTime(100),
      switchMap(([date, authUser, activeUser]) => {
        const userName = activeUser ?? authUser?.shortName;
        return combineLatest([
          this.store
            .collection<HouseTasks>(CollectionKey.HouseTasks, (ref) => {
              let query: Query = ref;
              query = query.where('who', '==', userName);
              query = query.where('dateString', '==', date).limit(1);
              return query;
            })
            .valueChanges({ idField: 'id' }),
          of(date),
          of(userName),
        ]);
      }),
      map(([task, date, user]) => {
        if (task && task?.length > 0) {
          return this.convertHouseTasks(task[0]);
        }
        return this.getNewHouseTasksForUser(user, date);
      })
    );
  }

  selectTask(task: HouseTasks) {
    console.log(task);
    this.activeDate$.next(task.date.toLocaleDateString());
    this.activeUser$.next(task.who);
  }

  convertHouseTasks(tasks: HouseTasks): HouseTasks {
    tasks.saved = true;
    tasks.date = this.dateUtilityService.getDateFromTimeStamp(tasks.date);
    return tasks;
  }

  getPreviousPage() {
    this.paging$.next(Paging.Previous);
  }

  getNextPage() {
    this.paging$.next(Paging.Next);
  }

  resetPaging() {
    this.first = null;
    this.last = null;
    this.paging$.next(Paging.None);
  }

  getPrevious(myUser: string | null | undefined) {
    const aDate = this.getDateFromSubject();
    aDate.setDate(aDate.getDate() - 1);
    this.activeUser$.next(myUser);
    this.activeDate$.next(aDate.toLocaleDateString());
  }

  getNext(myUser: string | null | undefined) {
    const aDate = this.getDateFromSubject();
    aDate.setDate(aDate.getDate() + 1);
    this.activeUser$.next(myUser);
    this.activeDate$.next(aDate.toLocaleDateString());
  }

  getNewHouseTasksForUser(
    username: string | null | undefined,
    dateString: string
  ): HouseTasks {
    return {
      dateString: dateString,
      who: username,
      saved: false,
      date: this.getDateFromSubject()
    } as HouseTasks;
  }

  private getDateFromSubject(): Date {
    return this.dateUtilityService.getDateFromString(this.activeDate$.getValue());
  }

  save(activeTask: HouseTasks) {
    if (!activeTask) return;
    console.log(activeTask);
    activeTask.date = this.dateUtilityService.getDateWithDateStringTimeshift(this.activeDate$.getValue());
    this.store.collection(CollectionKey.HouseTasks).add(activeTask);
  }

  update(activeTask: HouseTasks) {
    if (!activeTask) return;

    activeTask.approved = null;
    this.store
      .collection(CollectionKey.HouseTasks)
      .doc(activeTask.id)
      .update(activeTask);
  }

  approve(activeTask: HouseTasks, approve: boolean) {
    if (!activeTask) return;

    activeTask.approved = approve;
    this.store
      .collection(CollectionKey.HouseTasks)
      .doc(activeTask.id)
      .update(activeTask);
  }
}

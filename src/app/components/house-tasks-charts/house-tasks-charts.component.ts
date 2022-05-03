import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { LegendPosition } from '@swimlane/ngx-charts';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { BarData, BarGroupData } from 'src/models/bar-group-data';
import { CollectionKey } from 'src/models/colletion-keys';
import { HouseTasks, HouseTasksLabels } from 'src/models/house-task';
import { multi } from './../../data/data';

export enum SummaryPeriod {
  Week = 'week',
  Month = 'month',
  All = 'all',
}

@Component({
  selector: 'app-house-tasks-charts',
  templateUrl: './house-tasks-charts.component.html',
  styleUrls: ['./house-tasks-charts.component.scss'],
})
export class HouseTasksChartsComponent {
  summaryPeriod = SummaryPeriod.Week;
  summaryPeriod$ = new BehaviorSubject<string>(SummaryPeriod.Week);
  tasksSummary$: Observable<HouseTasks[]>;

  kitchenData: BarGroupData[] = [];
  cleaningData: BarGroupData[] = [];

  view: [number, number] = [350, 350];
  showXAxis: boolean = true;
  showYAxis: boolean = false;
  gradient: boolean = true;
  showLegend: boolean = false;
  showXAxisLabel: boolean = false;
  showYAxisLabel: boolean = false;
  xAxisLabel: string = 'Co';
  yAxisLabel: string = 'Ile razy';
  showDataLabel = true;
  showGridLines = true;
  legendTitle: string = '';
  legendPosition = LegendPosition.Below;
  colorScheme = {
	domain: ['#009688', '#ffab40'],
  };

  constructor(private store: AngularFirestore) {
	this.tasksSummary$ = this.summaryPeriod$.pipe(
	  switchMap((period) => {
		let fromDate: Date;
		let toDate = new Date();
		return this.store
		  .collection<HouseTasks>(CollectionKey.HouseTasks, (ref) => {
			let query:
			  | firebase.default.firestore.CollectionReference
			  | firebase.default.firestore.Query = ref;
			query = query.orderBy('date', 'desc');

			if (period === SummaryPeriod.Week) {
			  fromDate = new Date(
				toDate.getFullYear(),
				toDate.getMonth(),
				toDate.getDate() - 7
			  );
			} else if (period === SummaryPeriod.Month) {
			  fromDate = new Date(
				toDate.getFullYear(),
				toDate.getMonth() - 1,
				toDate.getDate()
			  );
			} else {
			  fromDate = new Date(0);
			}
			query = query
			  .where('date', '>', fromDate)
			  .where('date', '<', toDate);
			return query;
		  })
		  .valueChanges({ idField: 'id' });
	  }),
	  tap((tasks) => {
		this.kitchenData = tasks.reduce<BarGroupData[]>((summary, task) => {
		  this.modifyKitchenSummary(summary, task);
		  return summary;
		}, []);
		this.cleaningData = tasks.reduce<BarGroupData[]>((summary, task) => {
			this.modifyCleaningSummary(summary, task);
			return summary;
		  }, []);
	  })
	);
  }

  changeTimePeriod(period: string) {
	  this.summaryPeriod$.next(period);
  }

  modifySummary(summary: BarGroupData[], task: HouseTasks) {
	this.modifyKitchenSummary(summary, task);
	this.modifyCleaningSummary(summary, task);
  }

  modifyKitchenSummary(summary: BarGroupData[], task: HouseTasks) {
	if (task.dinner === true) {
	  this.modifyEntry(task, summary, HouseTasksLabels.Dinner);
	}
	if (task.snacks === true) {
	  this.modifyEntry(task, summary, HouseTasksLabels.Snacks);
	}
	if (task.dishesAndKitchen === true) {
	  this.modifyEntry(task, summary, HouseTasksLabels.DishesAndKitchen);
	}
	if (task.dishwasher === true) {
	  this.modifyEntry(task, summary, HouseTasksLabels.Dishwasher);
	}
	if (task.groceries === true) {
	  this.modifyEntry(task, summary, HouseTasksLabels.Groceries);
	}
  }

  modifyCleaningSummary(summary: BarGroupData[], task: HouseTasks) {
	if (task.vacuuming === true) {
		this.modifyEntry(task, summary, HouseTasksLabels.Vacuuming);
	  }
	  if (task.dusting === true) {
		this.modifyEntry(task, summary, HouseTasksLabels.Dusting);
	  }
	  if (task.smallBathroom === true) {
		this.modifyEntry(task, summary, HouseTasksLabels.SmallBathroom);
	  }
	  if (task.bigBathroom === true) {
		this.modifyEntry(task, summary, HouseTasksLabels.BigBathroom);
	  }
	  if (task.laundry === true) {
		this.modifyEntry(task, summary, HouseTasksLabels.Laundry);
	  }
  }

  private modifyEntry(
	task: HouseTasks,
	summary: BarGroupData[],
	taskLabel: string
  ) {
	let taskGroup = summary?.find((g) => g.name === taskLabel);
	if (taskGroup) {
	  let entryForUser = taskGroup.series.find((s) => s.name === task.who);
	  if (entryForUser) {
		entryForUser.value++;
	  } else {
		entryForUser = {
		  name: task.who,
		  value: 1,
		} as BarData;
		taskGroup.series.push(entryForUser);
	  }
	} else {
	  const dinnerForUser = {
		name: task.who,
		value: 1,
	  } as BarData;
	  summary.push({
		name: taskLabel,
		series: [dinnerForUser],
	  } as BarGroupData);
	}
  }
}

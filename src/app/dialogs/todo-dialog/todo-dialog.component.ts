import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import moment from 'moment';
import { Todo, TodoPriority } from 'src/models/todo';

export interface TodoDialogData {
  todo: Todo | null;
}

export type TodoDialogResult =
  | { action: 'save'; todo: Todo }
  | { action: 'delete'; todo: Todo };

@Component({
    selector: 'app-todo-dialog',
    templateUrl: './todo-dialog.component.html',
    styleUrls: ['./todo-dialog.component.scss'],
    standalone: false
})
export class TodoDialogComponent {
  todo: Todo;
  isEdit: boolean;
  // Bound to the datepicker; the moment adapter (useUtc) works in Moments, so we
  // keep the deadline as a Moment here and convert to a JS Date on save.
  deadline: moment.Moment | null = null;
  TodoPriority = TodoPriority;

  priorities = [
    { value: TodoPriority.Low, label: 'Niski' },
    { value: TodoPriority.Standard, label: 'Standardowy' },
    { value: TodoPriority.High, label: 'Wysoki' },
  ];

  deadlinePresets = [
    { label: '1 dzień', amount: 1, unit: 'days' as moment.unitOfTime.DurationConstructor },
    { label: '1 tydzień', amount: 1, unit: 'weeks' as moment.unitOfTime.DurationConstructor },
    { label: '2 tygodnie', amount: 2, unit: 'weeks' as moment.unitOfTime.DurationConstructor },
    { label: '1 miesiąc', amount: 1, unit: 'months' as moment.unitOfTime.DurationConstructor },
  ];

  constructor(
    public dialogRef: MatDialogRef<TodoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TodoDialogData
  ) {
    this.isEdit = !!data?.todo;
    this.todo = data?.todo
      ? { ...data.todo }
      : ({
          description: '',
          priority: TodoPriority.Standard,
          deadline: null,
          shared: true,
        } as Todo);
    this.deadline = this.todo.deadline
      ? moment.utc(this.todo.deadline)
      : null;
  }

  setDeadlinePreset(amount: number, unit: moment.unitOfTime.DurationConstructor): void {
    // Take the local calendar day (e.g. tomorrow) and pin it to UTC midnight so it
    // round-trips consistently with datepicker-selected values (adapter uses UTC).
    const targetDay = moment().add(amount, unit).format('YYYY-MM-DD');
    this.deadline = moment.utc(targetDay);
  }

  clearDeadline(): void {
    this.deadline = null;
  }

  get isValid(): boolean {
    return !!this.todo.description && this.todo.description.trim().length > 0;
  }

  save(): void {
    if (!this.isValid) return;
    this.todo.description = this.todo.description.trim();
    this.todo.deadline = this.deadline ? this.deadline.toDate() : null;
    this.dialogRef.close({ action: 'save', todo: this.todo } as TodoDialogResult);
  }

  delete(): void {
    this.dialogRef.close({ action: 'delete', todo: this.todo } as TodoDialogResult);
  }
}

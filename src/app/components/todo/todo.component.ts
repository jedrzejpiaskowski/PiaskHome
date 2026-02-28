import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { CollectionKey } from 'src/models/colletion-keys';
import { TodoPriority, TodoTask } from 'src/models/todo-task';
import { User } from 'src/models/user';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss'],
})
export class TodoComponent {
  user$: Observable<User | null | undefined>;
  tasks$: Observable<TodoTask[]>;
  activeTasks$: Observable<TodoTask[]>;
  archivedTasks$: Observable<TodoTask[]>;
  isArchiveExpanded = false;
  editingTaskId: string | null = null;

  owners = ['Jędrek', 'Kasia'];
  priorities = [TodoPriority.Low, TodoPriority.Normal, TodoPriority.High];
  priorityLabels: Record<TodoPriority, string> = {
    [TodoPriority.Low]: 'Niski',
    [TodoPriority.Normal]: 'Normalny',
    [TodoPriority.High]: 'Wysoki',
  };
  TodoPriority = TodoPriority;

  getPriorityLabel(priority: TodoPriority): string {
    return this.priorityLabels[priority] ?? 'Normalny';
  }

  getPriorityDots(priority: TodoPriority): number[] {
    if (priority === TodoPriority.Low) {
      return [1];
    }
    if (priority === TodoPriority.High) {
      return [1, 2, 3];
    }
    return [1, 2];
  }

  isDeadlineToday(task: TodoTask): boolean {
    if (!(task.deadlineDate instanceof Date)) {
      return false;
    }
    const deadline = this.toStartOfDay(task.deadlineDate).getTime();
    const today = this.toStartOfDay(new Date()).getTime();
    return deadline === today;
  }

  isDeadlinePassed(task: TodoTask): boolean {
    if (!(task.deadlineDate instanceof Date)) {
      return false;
    }
    const deadline = this.toStartOfDay(task.deadlineDate).getTime();
    const today = this.toStartOfDay(new Date()).getTime();
    return deadline < today;
  }

  newTask: Pick<TodoTask, 'description' | 'owner' | 'deadlineDate' | 'priority'> = {
    description: '',
    owner: 'Jędrek',
    deadlineDate: null,
    priority: TodoPriority.Normal,
  };

  constructor(
    private store: AngularFirestore,
    private auth: AuthService,
    private title: Title,
    private dialog: MatDialog
  ) {
    this.title.setTitle('TODO');
    this.user$ = this.auth.user$;

    this.tasks$ = this.store
      .collection<TodoTask>(CollectionKey.Todo)
      .valueChanges({ idField: 'id' })
      .pipe(
        map((tasks) =>
          tasks
            .map((task) => this.convertTodoTask(task))
            .sort((a, b) => this.compareTasks(a, b))
        )
      );

    this.activeTasks$ = this.tasks$.pipe(
      map((tasks) => tasks.filter((t) => !t.done))
    );

    this.archivedTasks$ = this.tasks$.pipe(
      map((tasks) => tasks.filter((t) => t.done))
    );

    this.auth.user$.subscribe((user) => {
      const shortName = user?.shortName ?? null;
      if (shortName && this.owners.includes(shortName)) {
        this.newTask.owner = shortName;
      }
    });
  }

  saveTask() {
    if (!this.newTask.description || this.newTask.description.trim().length === 0) {
      return;
    }

    if (this.editingTaskId) {
      const updateData: Partial<TodoTask> = {
        description: this.newTask.description.trim(),
        owner: this.newTask.owner,
        deadlineDate: this.newTask.deadlineDate ?? null,
        priority: this.newTask.priority ?? TodoPriority.Normal,
      };
      this.store
        .collection(CollectionKey.Todo)
        .doc(this.editingTaskId)
        .update(updateData);
      this.resetForm();
      return;
    }

    const task: TodoTask = {
      description: this.newTask.description.trim(),
      owner: this.newTask.owner,
      dateAdded: new Date(),
      deadlineDate: this.newTask.deadlineDate ?? null,
      priority: this.newTask.priority ?? TodoPriority.Normal,
      done: false,
    };

    this.store.collection(CollectionKey.Todo).add(task);
    this.resetForm();
  }

  editTask(task: TodoTask) {
    if (!task.id) {
      return;
    }

    this.editingTaskId = task.id;
    this.newTask.description = task.description;
    this.newTask.owner = task.owner;
    this.newTask.deadlineDate = task.deadlineDate ?? null;
    this.newTask.priority = task.priority;
  }

  markAsDone(task: TodoTask) {
    if (!task.id) {
      return;
    }
    this.store.collection(CollectionKey.Todo).doc(task.id).update({ done: true });
    if (this.editingTaskId === task.id) {
      this.resetForm();
    }
  }

  restoreTask(task: TodoTask) {
    if (!task.id) {
      return;
    }
    this.store.collection(CollectionKey.Todo).doc(task.id).update({ done: false });
  }

  deleteTask(task: TodoTask) {
    if (!task.id) {
      return;
    }

    const confirmationDialogRef = this.dialog.open(
      ConfirmationDialogComponent,
      {
        data: 'Czy na pewno chcesz usunąć?',
      }
    );

    confirmationDialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.store.collection(CollectionKey.Todo).doc(task.id).delete();
        if (this.editingTaskId === task.id) {
          this.resetForm();
        }
      }
    });
  }

  toggleArchive() {
    this.isArchiveExpanded = !this.isArchiveExpanded;
  }

  cancelEdit() {
    this.resetForm();
  }

  private resetForm() {
    this.editingTaskId = null;
    this.newTask.description = '';
    this.newTask.deadlineDate = null;
    this.newTask.priority = TodoPriority.Normal;
  }

  private convertTodoTask(task: TodoTask): TodoTask {
    const converted = { ...task, done: !!task.done };

    if (converted.dateAdded && !(converted.dateAdded instanceof Date)) {
      converted.dateAdded = this.getDateFromTimeStamp(converted.dateAdded);
    }

    if (converted.deadlineDate && !(converted.deadlineDate instanceof Date)) {
      converted.deadlineDate = this.getDateFromTimeStamp(converted.deadlineDate);
    }

    return converted;
  }

  private getDateFromTimeStamp(stamp: any): Date {
    const secs = stamp?.seconds;
    if (!secs) {
      return new Date(stamp);
    }
    const date = new Date(0);
    date.setUTCSeconds(secs);
    return date;
  }

  private compareTasks(a: TodoTask, b: TodoTask): number {
    const aDeadline = a.deadlineDate instanceof Date ? a.deadlineDate.getTime() : Number.NEGATIVE_INFINITY;
    const bDeadline = b.deadlineDate instanceof Date ? b.deadlineDate.getTime() : Number.NEGATIVE_INFINITY;
    if (aDeadline !== bDeadline) {
      return bDeadline - aDeadline;
    }

    const priorityOrder: Record<TodoPriority, number> = {
      [TodoPriority.Low]: 1,
      [TodoPriority.Normal]: 2,
      [TodoPriority.High]: 3,
    };
    const aPriority = priorityOrder[a.priority] ?? 2;
    const bPriority = priorityOrder[b.priority] ?? 2;
    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    const aAdded = a.dateAdded instanceof Date ? a.dateAdded.getTime() : 0;
    const bAdded = b.dateAdded instanceof Date ? b.dateAdded.getTime() : 0;
    return bAdded - aAdded;
  }

  private toStartOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
}

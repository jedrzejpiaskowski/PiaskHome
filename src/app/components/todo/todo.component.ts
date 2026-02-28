import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Title } from '@angular/platform-browser';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  owners = ['Jędrek', 'Kasia'];
  priorities = [TodoPriority.Low, TodoPriority.Normal, TodoPriority.High];
  TodoPriority = TodoPriority;

  newTask: Pick<TodoTask, 'description' | 'owner' | 'deadlineDate' | 'priority'> = {
    description: '',
    owner: 'Jędrek',
    deadlineDate: null,
    priority: TodoPriority.Normal,
  };

  constructor(
    private store: AngularFirestore,
    private auth: AuthService,
    private title: Title
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

    this.auth.user$.subscribe((user) => {
      const shortName = user?.shortName ?? null;
      if (shortName && this.owners.includes(shortName)) {
        this.newTask.owner = shortName;
      }
    });
  }

  addTask() {
    if (!this.newTask.description || this.newTask.description.trim().length === 0) {
      return;
    }

    const task: TodoTask = {
      description: this.newTask.description.trim(),
      owner: this.newTask.owner,
      dateAdded: new Date(),
      deadlineDate: this.newTask.deadlineDate ?? null,
      priority: this.newTask.priority ?? TodoPriority.Normal,
    };

    this.store.collection(CollectionKey.Todo).add(task);
    this.newTask.description = '';
    this.newTask.deadlineDate = null;
    this.newTask.priority = TodoPriority.Normal;
  }

  private convertTodoTask(task: TodoTask): TodoTask {
    const converted = { ...task };

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
}

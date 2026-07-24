import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ConfirmationDialogComponent } from 'src/app/dialogs/confirmation-dialog/confirmation-dialog.component';
import {
  TodoDialogComponent,
  TodoDialogResult,
} from 'src/app/dialogs/todo-dialog/todo-dialog.component';
import { Todo, TodoPriority } from 'src/models/todo';
import { User } from 'src/models/user';
import { AuthService } from '../../services/auth.service';
import { TodoService } from '../../services/todo.service';

@Component({
    selector: 'app-todo',
    templateUrl: './todo.component.html',
    styleUrls: ['./todo.component.scss'],
    standalone: false
})
export class TodoComponent {
  todos$: Observable<Todo[]>;
  user$: Observable<User | null | undefined>;
  showAll$ = new BehaviorSubject<boolean>(true);

  private priorityWeight: Record<TodoPriority, number> = {
    [TodoPriority.High]: 3,
    [TodoPriority.Standard]: 2,
    [TodoPriority.Low]: 1,
  };

  constructor(
    private todoService: TodoService,
    private auth: AuthService,
    private dialog: MatDialog,
    private title: Title
  ) {
    this.title.setTitle('Zadania');
    this.user$ = this.auth.user$;

    this.todos$ = combineLatest([
      this.todoService.getTodos(),
      this.user$,
      this.showAll$,
    ]).pipe(
      map(([todos, user, showAll]) => {
        const filtered = showAll
          ? todos
          : todos.filter((t) => t.ownerUid === user?.uid);
        return [...filtered].sort((a, b) => this.compareTodos(a, b));
      })
    );
  }

  canModify(todo: Todo, user: User | null | undefined): boolean {
    return !!user && todo.ownerUid === user.uid;
  }

  setShowAll(showAll: boolean): void {
    this.showAll$.next(showAll);
  }

  toggleComplete(todo: Todo, completed: boolean): void {
    this.todoService.update({ ...todo, completed });
  }

  openAdd(user: User | null | undefined): void {
    if (!user) return;
    const dialogRef = this.dialog.open(TodoDialogComponent, {
      data: { todo: null },
    });
    dialogRef.afterClosed().subscribe((result: TodoDialogResult | null) => {
      if (result?.action !== 'save') return;
      this.todoService.add({
        ...result.todo,
        createdDate: new Date(),
        completed: false,
        ownerUid: user.uid,
        owner: user.shortName ?? user.displayName ?? '',
      } as Todo);
    });
  }

  openEdit(todo: Todo): void {
    const dialogRef = this.dialog.open(TodoDialogComponent, {
      data: { todo },
    });
    dialogRef.afterClosed().subscribe((result: TodoDialogResult | null) => {
      if (!result) return;
      if (result.action === 'save') {
        this.todoService.update(result.todo);
      } else if (result.action === 'delete') {
        this.confirmDelete(result.todo);
      }
    });
  }

  confirmDelete(todo: Todo): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: 'Czy na pewno chcesz usunąć zadanie?',
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.todoService.delete(todo.id);
      }
    });
  }

  private compareTodos(a: Todo, b: Todo): number {
    // 1. Active tasks before completed ones.
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Tasks with a deadline before those without; nearest deadline first.
    const aHasDeadline = !!a.deadline;
    const bHasDeadline = !!b.deadline;
    if (aHasDeadline !== bHasDeadline) {
      return aHasDeadline ? -1 : 1;
    }
    if (aHasDeadline && bHasDeadline) {
      const diff =
        new Date(a.deadline as Date).getTime() -
        new Date(b.deadline as Date).getTime();
      if (diff !== 0) return diff;
    }
    // 3. Higher priority first.
    const priorityDiff =
      this.priorityWeight[b.priority] - this.priorityWeight[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // 4. Newest created first.
    return (
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  }
}

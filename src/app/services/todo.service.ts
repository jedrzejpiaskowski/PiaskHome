import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CollectionKey } from 'src/models/colletion-keys';
import { Todo } from 'src/models/todo';
import { DateUtilityService } from './date-utility.service';

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  constructor(
    private store: Firestore,
    private dateUtilityService: DateUtilityService
  ) {}

  getTodos(): Observable<Todo[]> {
    return collectionData<Todo>(
      collection(this.store, CollectionKey.Todos) as any,
      { idField: 'id' }
    ).pipe(map((todos) => todos.map((t) => this.convertTodo(t))));
  }

  add(todo: Todo): void {
    const { id, ...data } = todo;
    addDoc(collection(this.store, CollectionKey.Todos), data);
  }

  update(todo: Todo): void {
    if (!todo?.id) return;
    updateDoc(doc(this.store, CollectionKey.Todos, todo.id), { ...todo });
  }

  delete(id: string): void {
    if (!id) return;
    deleteDoc(doc(this.store, CollectionKey.Todos, id));
  }

  private convertTodo(todo: Todo): Todo {
    if (todo.createdDate && !(todo.createdDate instanceof Date)) {
      todo.createdDate = this.dateUtilityService.getDateFromTimeStamp(
        todo.createdDate
      );
    }
    if (todo.deadline && !(todo.deadline instanceof Date)) {
      todo.deadline = this.dateUtilityService.getDateFromTimeStamp(
        todo.deadline
      );
    }
    return todo;
  }
}

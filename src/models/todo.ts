export enum TodoPriority {
  Low = 'low',
  Standard = 'standard',
  High = 'high',
}

export interface Todo {
  id: string;
  description: string;
  createdDate: Date;
  priority: TodoPriority;
  deadline?: Date | null;
  ownerUid: string;
  owner: string;
  completed: boolean;
}

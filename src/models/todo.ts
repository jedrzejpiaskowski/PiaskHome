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
  // When true, any user can edit/complete/delete the task (not just the owner).
  // Set at creation and read-only afterwards.
  shared: boolean;
}

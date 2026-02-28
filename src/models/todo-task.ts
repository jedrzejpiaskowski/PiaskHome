export enum TodoPriority {
  Low = 'Low',
  Normal = 'Normal',
  High = 'High',
}

export interface TodoTask {
  id?: string;
  description: string;
  dateAdded: Date | any;
  owner: string | null | undefined;
  deadlineDate?: Date | null | any;
  priority: TodoPriority;
}

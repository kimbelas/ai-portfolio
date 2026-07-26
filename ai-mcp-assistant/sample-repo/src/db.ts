// In-memory data store for TaskFlow.
export interface Task {
  id: string;
  title: string;
  done: boolean;
}

const tasks = new Map<string, Task>();

export function saveTask(task: Task): void {
  tasks.set(task.id, task);
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id);
}

export function listTasks(): Task[] {
  return [...tasks.values()];
}

// TODO: persist tasks to disk instead of keeping them only in memory.

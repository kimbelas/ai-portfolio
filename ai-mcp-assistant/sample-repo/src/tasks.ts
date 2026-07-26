import { saveTask, getTask, listTasks, type Task } from "./db";

let counter = 0;

export function createTask(title: string): Task {
  const task: Task = { id: `t${++counter}`, title, done: false };
  saveTask(task);
  return task;
}

export function completeTask(id: string): boolean {
  const task = getTask(id);
  if (!task) return false;
  task.done = true;
  saveTask(task);
  return true;
}

export function allTasks(): Task[] {
  return listTasks();
}

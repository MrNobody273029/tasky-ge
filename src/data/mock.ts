// src/data/mock.ts

export type Task = {
  id: string;
  title: string;
  description?: string;
  ownerId?: string;
  status?: string;
};

export type Owner = {
  id: string;
  name?: string;
  rating?: number;
};

// მარტივი demo ობიექტები (იმპორტისთვის: { owner, task })
export const owner: Owner = { id: "demo-owner", name: "Demo Owner", rating: 5 };
export const task: Task = {
  id: "demo-task",
  title: "Demo Task",
  description: "Demo task for build",
  ownerId: owner.id,
  status: "PUBLISHED",
};

// სურვილისთვის თუ სადმე იყენებ მასივებს
export const owners: Owner[] = [owner];
export const tasks: Task[] = [task];
export const categories: string[] = [];

export default { owner, task, owners, tasks, categories };

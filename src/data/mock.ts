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
  location?: string;
  languages?: string[];
  since?: string;
};

// demo ობიექტები, რომ build გაიაროს
export const owner: Owner = {
  id: "demo-owner",
  name: "Demo Owner",
  rating: 5,
  location: "Tbilisi, GE",
  languages: ["KA", "EN"],
  since: "2024",
};

export const task: Task = {
  id: "demo-task",
  title: "Demo Task",
  description: "Demo task for build",
  ownerId: owner.id,
  status: "PUBLISHED",
};

export const owners: Owner[] = [owner];
export const tasks: Task[] = [task];
export const categories: string[] = [];

export default { owner, task, owners, tasks, categories };

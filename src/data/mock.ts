// src/data/mock.ts
// Ultra-safe mocks for build/demo

// ლუზე ტიპები, რომ TS არ შეგვაწუხოს
export type Owner = Record<string, any>;
export type Task  = Record<string, any>;

// მინ. მნიშვნელობები, რომ runtime-ში არ აფეთქდეს join/სტრინგები და ა.შ.
export const owner: Owner = {
  id: "demo-owner",
  name: "Demo Owner",
  rating: 5,
  location: "Tbilisi, GE",
  languages: ["KA", "EN"],
  since: "2024",
  // სხვა ნებისმიერ ველს რომ გამოიძახებდეს კოდი:
  bio: "",
  avatarUrl: "",
};

export const task: Task = {
  id: "demo-task",
  title: "Demo Task",
  description: "Demo task for build",
  ownerId: owner.id,
  status: "PUBLISHED",
  budget: 0,
  createdAt: new Date().toISOString(),
  attachments: [],
};

export const owners: Owner[] = [owner];
export const tasks: Task[]  = [task];
export const categories: string[] = ["general"];

export default { owner, task, owners, tasks, categories };

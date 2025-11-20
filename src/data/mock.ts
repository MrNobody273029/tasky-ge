// Minimal mock data so the build passes
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

export const tasks: Task[] = [];
export const owners: Owner[] = [];
export const categories: string[] = [];

// fallback bundle
const mock = { tasks, owners, categories };
export default mock;

// Database types for SkillSprint
// These types map to the Supabase database schema

export type ProjectStatus = 'active' | 'on_hold' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  target_end_date: string | null;
  status: ProjectStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  start_date: string | null;
  due_date: string;
  priority: TaskPriority | null;
  category_id?: string | null;
  order_index?: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithTasks extends Project {
  tasks?: Task[];
}

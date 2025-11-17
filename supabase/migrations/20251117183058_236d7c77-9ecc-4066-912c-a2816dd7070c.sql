-- Add order_index column to tasks table for custom ordering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create an index for better query performance on order_index
CREATE INDEX IF NOT EXISTS idx_tasks_order_index ON tasks(project_id, order_index);
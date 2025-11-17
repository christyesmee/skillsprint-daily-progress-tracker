import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskDialog } from "./TaskDialog";
import { SortableTaskList } from "./SortableTaskList";
import type { Task, TaskStatus } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskListViewProps {
  tasks: Task[];
  projectId: string;
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onCreateTask: (data: Partial<Task>) => Promise<void>;
}

export function TaskListView({
  tasks,
  projectId,
  onUpdateTask,
  onDeleteTask,
  onCreateTask,
}: TaskListViewProps) {
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [sortBy, setSortBy] = useState<string>("custom");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(
      (task) => filterStatus === "all" || task.status === filterStatus
    );

    // Apply sorting
    if (sortBy === "status") {
      result.sort((a, b) => a.status.localeCompare(b.status));
    } else if (sortBy === "priority") {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      result.sort((a, b) => {
        const aPriority = a.priority ? priorityOrder[a.priority] : 3;
        const bPriority = b.priority ? priorityOrder[b.priority] : 3;
        return aPriority - bPriority;
      });
    } else if (sortBy === "category") {
      result.sort((a, b) => {
        const aCategory = categories.find((c: any) => c.id === a.category_id);
        const bCategory = categories.find((c: any) => c.id === b.category_id);
        const aName = aCategory?.name || "";
        const bName = bCategory?.name || "";
        return aName.localeCompare(bName);
      });
    } else if (sortBy === "due_date") {
      result.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    } else {
      // Custom order - sort by order_index
      result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }

    return result;
  }, [tasks, filterStatus, sortBy, categories]);

  const getStatusBadge = (status: TaskStatus) => {
    const styles = {
      todo: "bg-status-todo text-status-todo-foreground",
      in_progress: "bg-status-in-progress text-status-in-progress-foreground",
      done: "bg-status-done text-status-done-foreground",
    };

    const labels = {
      todo: "To Do",
      in_progress: "In Progress",
      done: "Done",
    };

    return (
      <Badge className={styles[status]} variant="secondary">
        {labels[status]}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: Task["priority"]) => {
    if (!priority) return null;

    const styles = {
      low: "bg-priority-low text-foreground",
      medium: "bg-priority-medium text-foreground",
      high: "bg-priority-high text-foreground",
    };

    return (
      <Badge className={styles[priority]} variant="secondary">
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const handleReorder = async (reorderedTasks: Task[]) => {
    // Update order_index for all tasks
    const updates = reorderedTasks.map((task, index) => ({
      id: task.id,
      order_index: index,
    }));

    try {
      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
      toast.success("Task order updated");
    } catch (error) {
      toast.error("Failed to update task order");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as TaskStatus | "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      <SortableTaskList
        tasks={filteredAndSortedTasks}
        categories={categories}
        onEdit={setEditingTask}
        onDelete={onDeleteTask}
        onReorder={handleReorder}
        getStatusBadge={getStatusBadge}
        getPriorityBadge={getPriorityBadge}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {editingTask && (
        <TaskDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
          projectId={projectId}
          onSave={async (data) => {
            await onUpdateTask(editingTask.id, data);
            setEditingTask(null);
          }}
        />
      )}

      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        onSave={async (data) => {
          await onCreateTask(data);
          setCreateDialogOpen(false);
        }}
      />
    </div>
  );
}

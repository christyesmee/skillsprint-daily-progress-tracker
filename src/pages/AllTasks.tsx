import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/category/CategoryBadge";
import { SortableTaskList } from "@/components/task/SortableTaskList";
import { TaskDialog } from "@/components/task/TaskDialog";
import type { Task, TaskStatus } from "@/types/database";
import { toast } from "sonner";

interface TaskWithProject extends Task {
  projects: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

export default function AllTasks() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("custom");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-tasks", selectedProjects],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select(
          `
          *,
          projects (name)
        `
        )
        .order("order_index");

      if (selectedProjects.length > 0) {
        query = query.in("project_id", selectedProjects);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TaskWithProject[];
    },
  });

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

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const sortedTasks = useMemo(() => {
    let result = [...tasks];

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
      // Custom order
      result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    }

    return result;
  }, [tasks, sortBy, categories]);

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

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(data).eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      throw error;
    }

    toast.success("Task updated successfully!");
    
    // Invalidate queries to refresh the list
    queryClient.invalidateQueries({ queryKey: ["all-tasks", selectedProjects] });
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted successfully!");
  };

  const handleReorder = async (reorderedTasks: Task[]) => {
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
      queryClient.invalidateQueries({ queryKey: ["all-tasks", selectedProjects] });
    } catch (error) {
      toast.error("Failed to update task order");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          All Tasks
        </h1>
        <p className="text-lg text-muted-foreground">
          View and filter tasks across all projects
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center gap-2">
                <Checkbox
                  id={`project-${project.id}`}
                  checked={selectedProjects.includes(project.id)}
                  onCheckedChange={() => toggleProject(project.id)}
                />
                <label
                  htmlFor={`project-${project.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {project.name}
                </label>
              </div>
            ))}
            {selectedProjects.length > 0 && (
              <button
                onClick={() => setSelectedProjects([])}
                className="text-sm text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Tasks ({tasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SortableTaskList
            tasks={sortedTasks}
            categories={categories}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
            onUpdate={handleUpdateTask}
            onTaskClick={setEditingTask}
            onReorder={handleReorder}
            getStatusBadge={getStatusBadge}
            getPriorityBadge={getPriorityBadge}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </CardContent>
      </Card>

      {editingTask && (
        <TaskDialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          task={editingTask}
          projectId={editingTask.project_id}
          onSave={async (data) => {
            await handleUpdateTask(editingTask.id, data);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

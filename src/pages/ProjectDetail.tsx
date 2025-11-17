import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, List, Calendar, ArrowLeft } from "lucide-react";
import { ProjectDialog } from "@/components/project/ProjectDialog";
import { TaskListView } from "@/components/task/TaskListView";
import { TaskTimelineView } from "@/components/task/TaskTimelineView";
import { CategoryManagement } from "@/components/category/CategoryManagement";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Project, Task } from "@/types/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ViewMode = "list" | "timeline";

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId!)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });

  const handleUpdateProject = async (data: Partial<Project>) => {
    const { error } = await supabase.from("projects").update(data).eq("id", projectId!);

    if (error) {
      toast.error("Failed to update project");
      throw error;
    }

    toast.success("Project updated successfully!");
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const handleDeleteProject = async () => {
    const { error } = await supabase.from("projects").delete().eq("id", projectId!);

    if (error) {
      toast.error("Failed to delete project");
      return;
    }

    toast.success("Project deleted successfully!");
    window.location.href = "/";
  };

  const handleCreateTask = async (data: Partial<Task>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const insertData: any = {
      ...data,
      user_id: user.id,
    };

    const { error } = await supabase.from("tasks").insert(insertData);

    if (error) {
      toast.error("Failed to create task");
      throw error;
    }

    toast.success("Task created successfully!");
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  const handleUpdateTask = async (taskId: string, data: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(data).eq("id", taskId);

    if (error) {
      toast.error("Failed to update task");
      throw error;
    }

    toast.success("Task updated successfully!");
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (error) {
      toast.error("Failed to delete task");
      return;
    }

    toast.success("Task deleted successfully!");
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  };

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: Project["status"]) => {
    const styles = {
      active: "bg-status-in-progress text-status-in-progress-foreground",
      on_hold: "bg-status-todo text-status-todo-foreground",
      completed: "bg-status-done text-status-done-foreground",
    };

    const labels = {
      active: "Active",
      on_hold: "On Hold",
      completed: "Completed",
    };

    return (
      <Badge className={styles[status]} variant="secondary">
        {labels[status]}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Button>

      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {project.name}
            </h1>
            {getStatusBadge(project.status)}
          </div>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.start_date && (
              <span>Started: {format(new Date(project.start_date), "MMM dd, yyyy")}</span>
            )}
            {project.target_end_date && (
              <span>Target: {format(new Date(project.target_end_date), "MMM dd, yyyy")}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CategoryManagement />
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
          <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-2 border-b pb-4">
        <Button
          variant={viewMode === "list" ? "default" : "outline"}
          onClick={() => setViewMode("list")}
        >
          <List className="h-4 w-4 mr-2" />
          List View
        </Button>
        <Button
          variant={viewMode === "timeline" ? "default" : "outline"}
          onClick={() => setViewMode("timeline")}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Timeline View
        </Button>
      </div>

      {/* Tasks View */}
      {viewMode === "list" ? (
        <TaskListView
          tasks={tasks}
          projectId={projectId!}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
        />
      ) : (
        <TaskTimelineView tasks={tasks} />
      )}

      {/* Dialogs */}
      {project && (
        <ProjectDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          project={project}
          onSave={handleUpdateProject}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project.name}"? This will also delete all tasks in
              this project. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

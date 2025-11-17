import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/category/CategoryBadge";

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string;
  project_id: string;
  category_id: string | null;
  projects: {
    name: string;
  };
  categories: {
    name: string;
    color: string;
  } | null;
}

interface Project {
  id: string;
  name: string;
}

export default function AllTasks() {
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

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
          projects (name),
          categories (name, color)
        `
        )
        .order("due_date");

      if (selectedProjects.length > 0) {
        query = query.in("project_id", selectedProjects);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Task[];
    },
  });

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "done":
        return "default";
      case "in_progress":
        return "secondary";
      default:
        return "outline";
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
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No tasks found
            </p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{task.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{task.projects.name}</span>
                      <span>•</span>
                      <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.categories && (
                      <CategoryBadge
                        name={task.categories.name}
                        color={task.categories.color}
                      />
                    )}
                    <Badge variant={getStatusBadgeVariant(task.status)}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Folder, CheckCircle2, Clock, Plus, Calendar, Target } from "lucide-react";
import { ProjectDialog } from "@/components/project/ProjectDialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/types/database";
import { format } from "date-fns";

export default function Home() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Project[];
    },
  });

  const { data: upcomingSessions = [] } = useQuery({
    queryKey: ["upcoming-review-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_sessions")
        .select("*")
        .gte("scheduled_date", format(new Date(), "yyyy-MM-dd"))
        .order("scheduled_date", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    onHold: projects.filter((p) => p.status === "on_hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  const handleCreateProject = async (data: Partial<Project>) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const insertData: any = {
      ...data,
      user_id: user.id,
    };

    const { error } = await supabase.from("projects").insert(insertData);

    if (error) {
      toast.error("Failed to create project");
      throw error;
    }

    toast.success("Project created successfully!");
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-status-in-progress";
      case "on_hold":
        return "bg-status-todo";
      case "completed":
        return "bg-status-done";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Track your work progress and level up your skills
          </p>
        </div>
        <Button
          onClick={() => setCreateProjectOpen(true)}
          size="lg"
          className="shadow-glow"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-glow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-glow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-in-progress">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-glow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Hold
            </CardTitle>
            <Clock className="h-4 w-4 text-status-todo" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-todo">
              {stats.onHold}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-glow transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-done" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-status-done">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {upcomingSessions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Upcoming Reviews
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate("/reviews")}>
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {upcomingSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{session.type === "one_on_one" ? "1:1 Meeting" : "Performance Review"}</span>
                  <span className="text-sm text-muted-foreground">{format(new Date(session.scheduled_date), "MMM dd, yyyy")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-glow">
        <CardHeader>
          <CardTitle>Your Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No projects yet. Create your first project to get started!
              </p>
              <Button onClick={() => setCreateProjectOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-glow transition-all hover:scale-105"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(
                          project.status
                        )}`}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    {(project.start_date || project.target_end_date) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {project.start_date && (
                          <span>
                            {new Date(project.start_date).toLocaleDateString()}
                          </span>
                        )}
                        {project.start_date && project.target_end_date && (
                          <span>-</span>
                        )}
                        {project.target_end_date && (
                          <span>
                            {new Date(
                              project.target_end_date
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSave={handleCreateProject}
      />
    </div>
  );
}

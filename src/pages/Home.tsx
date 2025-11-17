import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { Project } from "@/types/database";

export default function Home() {
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

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    onHold: projects.filter((p) => p.status === "on_hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Welcome to SkillSprint</h1>
        <p className="text-lg text-muted-foreground">
          Track your work progress and level up your skills
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Projects
            </CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Projects
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              On Hold
            </CardTitle>
            <Clock className="h-4 w-4 text-status-todo" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.onHold}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-done" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Welcome to SkillSprint! Here's how to get started:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>Create your first project using the "+ New Project" button in the sidebar</li>
            <li>Add tasks to your project to break down your work</li>
            <li>Use the Timeline view to visualize your project schedule</li>
            <li>Track your daily progress and build your professional portfolio</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}

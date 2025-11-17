import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ProjectDialog } from "@/components/project/ProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import type { Project } from "@/types/database";

export default function Dashboard() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onCreateProject={() => setCreateProjectOpen(true)} />
        
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <h1 className="font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                SkillSprint
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/profile")}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Profile
            </Button>
          </header>
          
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <ProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onSave={handleCreateProject}
      />
    </SidebarProvider>
  );
}

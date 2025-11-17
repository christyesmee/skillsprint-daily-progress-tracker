import { Folder, Plus, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Project } from "@/types/database";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface AppSidebarProps {
  onCreateProject: () => void;
}

export function AppSidebar({ onCreateProject }: AppSidebarProps) {
  const sidebar = useSidebar();
  const collapsed = sidebar.state === "collapsed";
  const location = useLocation();

  const { data: projects = [], refetch } = useQuery({
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

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    }
  };

  const getStatusColor = (status: Project["status"]) => {
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
    <Sidebar className={collapsed ? "w-14" : "w-72"}>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold text-sidebar-primary">SkillSprint</h1>
            <p className="text-xs text-sidebar-foreground/70 mt-1">
              Track your work. Level up your skills.
            </p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <div className="px-3 py-2">
            <Button
              onClick={onCreateProject}
              className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90 text-sidebar-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              <span className="ml-2">New Project</span>
            </Button>
          </div>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              Projects
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={`/project/${project.id}`}
                      className="hover:bg-sidebar-accent/50 text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <div className="flex items-center gap-2 w-full min-w-0">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${getStatusColor(
                            project.status
                          )}`}
                        />
                        {!collapsed && (
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm">{project.name}</p>
                          </div>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          onClick={handleSignOut}
          variant="ghost"
          className="w-full text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-2">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

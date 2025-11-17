import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, ChevronLeft, ChevronRight, ListTodo } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import type { Project } from "@/types/database";

interface AppSidebarProps {
  onCreateProject: () => void;
}

export function AppSidebar({ onCreateProject }: AppSidebarProps) {
  const sidebar = useSidebar();
  const collapsed = sidebar.state === "collapsed";

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
    <>
      {/* Expand button when collapsed - fixed at left edge */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const trigger = document.querySelector('[data-sidebar="trigger"]') as HTMLElement;
            trigger?.click();
          }}
          className="fixed left-2 top-4 z-50 h-8 w-8 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      <Sidebar className={collapsed ? "w-14" : "w-60"}>
        <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <NavLink 
                to="/" 
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  SkillSprint
                </h2>
                <p className="text-xs text-muted-foreground">Track your progress</p>
              </NavLink>
            )}
            {collapsed && (
              <NavLink 
                to="/" 
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">SS</span>
                </div>
              </NavLink>
            )}
            {/* Collapse button inside sidebar when expanded */}
            <SidebarTrigger 
              className="h-8 w-8" 
              data-sidebar="trigger"
            >
              <ChevronLeft className="h-4 w-4" />
            </SidebarTrigger>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel>Actions</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <Button
                onClick={onCreateProject}
                className="w-full justify-start gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                {!collapsed && "New Project"}
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* All Tasks link */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/all-tasks"
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <ListTodo className="h-4 w-4" />
                      {!collapsed && <span>All Tasks</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel>Projects</SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {projects.map((project) => (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={`/project/${project.id}`}
                        className="hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${getStatusColor(
                            project.status
                          )}`}
                        />
                        {!collapsed && <span>{project.name}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-2"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign Out"}
          </Button>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

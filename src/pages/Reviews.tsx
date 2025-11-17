import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CareerChatbot } from "@/components/career/CareerChatbot";

export default function Reviews() {
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [cadenceDialogOpen, setCadenceDialogOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalDate, setNewGoalDate] = useState<Date>();
  const queryClient = useQueryClient();

  const { data: goals = [] } = useQuery({
    queryKey: ["career-goals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("career_goals")
        .select("*")
        .order("target_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: cadence } = useQuery({
    queryKey: ["review-cadence"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("review_cadence")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["review-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_sessions")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: recentTasks = [] } = useQuery({
    queryKey: ["recent-completed-tasks"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          *,
          task_skills(skill_id, skills(name))
        `
        )
        .eq("status", "done")
        .gte("updated_at", thirtyDaysAgo.toISOString())
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim() || !newGoalDate) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase.from("career_goals").insert({
        title: newGoalTitle,
        description: newGoalDescription || null,
        target_date: format(newGoalDate, "yyyy-MM-dd"),
        user_id: user.id,
      });

      if (error) throw error;
      toast.success("Goal created!");
      queryClient.invalidateQueries({ queryKey: ["career-goals"] });
      setGoalDialogOpen(false);
      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalDate(undefined);
    } catch (error) {
      console.error("Error creating goal:", error);
      toast.error("Failed to create goal");
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase.from("career_goals").delete().eq("id", goalId);
    if (error) {
      toast.error("Failed to delete goal");
      return;
    }
    toast.success("Goal deleted!");
    queryClient.invalidateQueries({ queryKey: ["career-goals"] });
  };

  const handleUpdateCadence = async (oneOnOne: string, performance: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error: upsertError } = await supabase
        .from("review_cadence")
        .upsert({
          user_id: user.id,
          one_on_one: oneOnOne,
          performance: performance,
        });

      if (upsertError) throw upsertError;

      await supabase.from("review_sessions").delete().eq("user_id", user.id);

      const sessions = [];
      const startDate = new Date();

      for (let i = 0; i < 12; i++) {
        let oneOnOneDate;
        if (oneOnOne === "weekly") {
          oneOnOneDate = addWeeks(startDate, i);
        } else if (oneOnOne === "biweekly") {
          oneOnOneDate = addWeeks(startDate, i * 2);
        } else {
          oneOnOneDate = addMonths(startDate, i);
        }

        sessions.push({
          user_id: user.id,
          type: "one_on_one",
          scheduled_date: format(oneOnOneDate, "yyyy-MM-dd"),
        });
      }

      const performanceCount = performance === "quarterly" ? 4 : 1;
      for (let i = 1; i <= performanceCount; i++) {
        const months = performance === "quarterly" ? i * 3 : 12;
        sessions.push({
          user_id: user.id,
          type: "performance",
          scheduled_date: format(addMonths(startDate, months), "yyyy-MM-dd"),
        });
      }

      const { error: insertError } = await supabase
        .from("review_sessions")
        .insert(sessions);

      if (insertError) throw insertError;

      toast.success("Review cadence updated!");
      queryClient.invalidateQueries({ queryKey: ["review-cadence"] });
      queryClient.invalidateQueries({ queryKey: ["review-sessions"] });
      setCadenceDialogOpen(false);
    } catch (error) {
      console.error("Error updating cadence:", error);
      toast.error("Failed to update cadence");
    }
  };

  const tasksBySkill = recentTasks.reduce((acc: any, task: any) => {
    const skills = task.task_skills || [];
    if (skills.length === 0) {
      if (!acc["No Skill"]) acc["No Skill"] = [];
      acc["No Skill"].push(task);
    } else {
      skills.forEach((ts: any) => {
        const skillName = ts.skills?.name || "Unknown";
        if (!acc[skillName]) acc[skillName] = [];
        acc[skillName].push(task);
      });
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Reviews & Development
          </h1>
          <p className="text-muted-foreground">Track your career goals and review schedule</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCadenceDialogOpen(true)} variant="outline">
            Set Review Cadence
          </Button>
          <Button onClick={() => setGoalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Career Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {goals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No goals set yet. Create one to get started!</p>
                ) : (
                  goals.map((goal: any) => (
                    <div key={goal.id} className="flex items-start justify-between p-3 border rounded">
                      <div className="flex-1">
                        <p className="font-medium">{goal.title}</p>
                        {goal.description && (
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        )}
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Target: {format(new Date(goal.target_date), "MMM dd, yyyy")}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteGoal(goal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Reviews</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scheduled reviews. Set your review cadence to generate sessions.
                  </p>
                ) : (
                  sessions.slice(0, 5).map((session: any) => (
                    <div key={session.id} className="p-3 border rounded">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{session.type}</Badge>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(session.scheduled_date), "MMM dd, yyyy")}
                        </p>
                      </div>
                      {session.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Completed Tasks by Skill</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(tasksBySkill).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed tasks in the last 30 days.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(tasksBySkill).map(([skillName, tasks]: any) => (
                    <div key={skillName}>
                      <h4 className="font-medium mb-2">{skillName}</h4>
                      <div className="space-y-2">
                        {tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="text-sm p-2 border rounded hover:bg-muted/50 cursor-pointer"
                          >
                            {task.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <CareerChatbot />
        </div>
      </div>

      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Career Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g., Learn React Advanced Patterns"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Additional details about this goal..."
              />
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newGoalDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newGoalDate ? format(newGoalDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={newGoalDate} onSelect={setNewGoalDate} />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleCreateGoal} className="w-full">
              Create Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cadenceDialogOpen} onOpenChange={setCadenceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Review Cadence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>1:1 with Manager</Label>
              <Select
                defaultValue={cadence?.one_on_one || "weekly"}
                onValueChange={(v) => {
                  const perf = cadence?.performance || "quarterly";
                  handleUpdateCadence(v, perf);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Performance Review</Label>
              <Select
                defaultValue={cadence?.performance || "quarterly"}
                onValueChange={(v) => {
                  const oneOn = cadence?.one_on_one || "weekly";
                  handleUpdateCadence(oneOn, v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskStatus, TaskPriority } from "@/types/database";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/category/CategoryBadge";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  projectName?: string;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
}

export function TaskDetailModal({ open, onOpenChange, task, projectName, onUpdate }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority || "medium");
  const [categoryId, setCategoryId] = useState<string | undefined>(task.category_id || undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(
    task.start_date ? new Date(task.start_date) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ["task-attachments", task.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_attachments")
        .select("*")
        .eq("task_id", task.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: skills = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skills").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: taskSkills = [] } = useQuery({
    queryKey: ["task-skills", task.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_skills")
        .select("skill_id, skills(name)")
        .eq("task_id", task.id);
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStatus(task.status);
    setPriority(task.priority || "medium");
    setCategoryId(task.category_id || undefined);
    setStartDate(task.start_date ? new Date(task.start_date) : undefined);
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
  }, [task]);

  const handleSave = async () => {
    if (!title.trim() || !dueDate) return;

    setSaving(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        category_id: categoryId || null,
        start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
        due_date: format(dueDate, "yyyy-MM-dd"),
      });
      toast.success("Task updated successfully!");
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // For now, store URL as placeholder (would need storage bucket setup)
      const { error } = await supabase.from("task_attachments").insert({
        task_id: task.id,
        file_name: file.name,
        file_url: filePath,
        file_type: file.type,
        file_size: file.size,
        user_id: user.id,
      });

      if (error) throw error;
      toast.success("File attached successfully!");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task.id] });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to attach file");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const { error } = await supabase.from("task_attachments").delete().eq("id", attachmentId);
      if (error) throw error;
      toast.success("Attachment removed");
      queryClient.invalidateQueries({ queryKey: ["task-attachments", task.id] });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast.error("Failed to remove attachment");
    }
  };

  const handleAddSkill = async (skillId: string) => {
    try {
      const { error } = await supabase.from("task_skills").insert({
        task_id: task.id,
        skill_id: skillId,
      });
      if (error) throw error;
      toast.success("Skill added!");
      queryClient.invalidateQueries({ queryKey: ["task-skills", task.id] });
    } catch (error) {
      console.error("Error adding skill:", error);
      toast.error("Failed to add skill");
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from("task_skills")
        .delete()
        .eq("task_id", task.id)
        .eq("skill_id", skillId);
      if (error) throw error;
      toast.success("Skill removed");
      queryClient.invalidateQueries({ queryKey: ["task-skills", task.id] });
    } catch (error) {
      console.error("Error removing skill:", error);
      toast.error("Failed to remove skill");
    }
  };

  const selectedSkills = taskSkills.map((ts: any) => ts.skill_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          {projectName && <p className="text-sm text-muted-foreground">Project: {projectName}</p>}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title*</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date*</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            <Select onValueChange={handleAddSkill}>
              <SelectTrigger>
                <SelectValue placeholder="Add skill" />
              </SelectTrigger>
              <SelectContent>
                {skills
                  .filter((s: any) => !selectedSkills.includes(s.id))
                  .map((skill: any) => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <div className="flex flex-wrap gap-2 mt-2">
              {taskSkills.map((ts: any) => (
                <Badge key={ts.skill_id} variant="secondary" className="gap-1">
                  {ts.skills.name}
                  <button
                    onClick={() => handleRemoveSkill(ts.skill_id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
            <div className="space-y-2 mt-2">
              {attachments.map((att: any) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2 border rounded bg-card"
                >
                  <span className="text-sm">{att.file_name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttachment(att.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim() || !dueDate}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

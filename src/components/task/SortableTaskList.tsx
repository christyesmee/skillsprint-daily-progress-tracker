import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { Pencil, Trash2, GripVertical, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/category/CategoryBadge";
import type { Task, TaskStatus, TaskPriority } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface SortableTaskRowProps {
  task: Task;
  categories: any[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onTaskClick: (task: Task) => void;
  getStatusBadge: (status: TaskStatus) => JSX.Element;
  getPriorityBadge: (priority: Task["priority"]) => JSX.Element | null;
}

function SortableTaskRow({
  task,
  categories,
  onEdit,
  onDelete,
  onUpdate,
  onTaskClick,
  getStatusBadge,
  getPriorityBadge,
}: SortableTaskRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    await onUpdate(task.id, { status: newStatus });
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    await onUpdate(task.id, { priority: newPriority });
  };

  const handleCategoryChange = async (newCategoryId: string) => {
    await onUpdate(task.id, { category_id: newCategoryId });
  };

  const handleDueDateChange = async (newDate: Date | undefined) => {
    if (newDate) {
      await onUpdate(task.id, { due_date: format(newDate, "yyyy-MM-dd") });
    }
  };

  const handleComplete = async (checked: boolean) => {
    await onUpdate(task.id, { status: checked ? "done" : "todo" });
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <Checkbox
          checked={task.status === "done"}
          onCheckedChange={handleComplete}
          aria-label="Mark as complete"
        />
      </TableCell>
      <TableCell className="w-10">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="cursor-pointer" onClick={() => onTaskClick(task)}>
        <div>
          <p className="font-medium">{task.title}</p>
          {task.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {task.description}
            </p>
          )}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.category_id || undefined} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent hover:bg-accent">
            <SelectValue placeholder="No category">
              {task.category_id && categories.find((c: any) => c.id === task.category_id) ? (
                <CategoryBadge
                  name={categories.find((c: any) => c.id === task.category_id)!.name}
                  color={categories.find((c: any) => c.id === task.category_id)!.color}
                />
              ) : (
                <Badge variant="outline">No category</Badge>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat: any) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent hover:bg-accent">
            <SelectValue>{getStatusBadge(task.status)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Select value={task.priority || "medium"} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent hover:bg-accent">
            <SelectValue>{getPriorityBadge(task.priority)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto p-0 hover:bg-accent font-normal justify-start"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(new Date(task.due_date), "MMM dd, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={new Date(task.due_date)}
              onSelect={handleDueDateChange}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

interface SortableTaskListProps {
  tasks: Task[];
  categories: any[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onTaskClick: (task: Task) => void;
  onReorder: (tasks: Task[]) => void;
  getStatusBadge: (status: TaskStatus) => JSX.Element;
  getPriorityBadge: (priority: Task["priority"]) => JSX.Element | null;
  sortBy: string;
  onSortChange: (value: string) => void;
}

export function SortableTaskList({
  tasks,
  categories,
  onEdit,
  onDelete,
  onUpdate,
  onTaskClick,
  onReorder,
  getStatusBadge,
  getPriorityBadge,
  sortBy,
  onSortChange,
}: SortableTaskListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorder(reorderedTasks);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Order</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-[30%]">Task</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No tasks found. Create your first task to get started!
                  </TableCell>
                </TableRow>
              ) : (
                <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {tasks.map((task) => (
                    <SortableTaskRow
                      key={task.id}
                      task={task}
                      categories={categories}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      onTaskClick={onTaskClick}
                      getStatusBadge={getStatusBadge}
                      getPriorityBadge={getPriorityBadge}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
    </>
  );
}

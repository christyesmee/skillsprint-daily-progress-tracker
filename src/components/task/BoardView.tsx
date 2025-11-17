import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Task, TaskStatus } from "@/types/database";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { format } from "date-fns";
import { CategoryBadge } from "@/components/category/CategoryBadge";

interface BoardViewProps {
  tasks: Task[];
  categories: any[];
  onUpdateTask: (taskId: string, data: Partial<Task>) => Promise<void>;
  onTaskClick: (task: Task) => void;
}

interface SortableTaskCardProps {
  task: Task;
  categories: any[];
  onTaskClick: (task: Task) => void;
}

function SortableTaskCard({ task, categories, onTaskClick }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const category = categories.find((c: any) => c.id === task.category_id);

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onTaskClick(task)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing pt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="font-medium text-sm">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {category && <CategoryBadge name={category.name} color={category.color} />}
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={
                      task.priority === "high"
                        ? "bg-priority-high/10 text-priority-high border-priority-high"
                        : task.priority === "medium"
                        ? "bg-priority-medium/10 text-priority-medium border-priority-medium"
                        : "bg-priority-low/10 text-priority-low border-priority-low"
                    }
                  >
                    {task.priority}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{format(new Date(task.due_date), "MMM dd")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BoardView({ tasks, categories, onUpdateTask, onTaskClick }: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const columns: { status: TaskStatus; title: string; color: string }[] = [
    { status: "todo", title: "To Do", color: "bg-status-todo" },
    { status: "in_progress", title: "In Progress", color: "bg-status-in-progress" },
    { status: "done", title: "Done", color: "bg-status-done" },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      onUpdateTask(taskId, { status: newStatus });
    }
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.status} className="flex flex-col">
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${column.color}`} />
                  {column.title}
                  <Badge variant="secondary" className="ml-auto">
                    {getTasksByStatus(column.status).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <SortableContext items={getTasksByStatus(column.status).map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {getTasksByStatus(column.status).map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        categories={categories}
                        onTaskClick={onTaskClick}
                      />
                    ))}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </DndContext>
  );
}

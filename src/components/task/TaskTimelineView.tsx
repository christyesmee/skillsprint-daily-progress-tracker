import { useMemo } from "react";
import { format, differenceInDays, parseISO } from "date-fns";
import type { Task, TaskStatus } from "@/types/database";
import { cn } from "@/lib/utils";

interface TaskTimelineViewProps {
  tasks: Task[];
}

export function TaskTimelineView({ tasks }: TaskTimelineViewProps) {
  const timelineData = useMemo(() => {
    if (tasks.length === 0) return null;

    // Find the earliest start date and latest due date
    const dates = tasks.flatMap((task) => [
      task.start_date ? new Date(task.start_date) : new Date(task.due_date),
      new Date(task.due_date),
    ]);

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const totalDays = differenceInDays(maxDate, minDate) + 1;

    // Generate timeline scale
    const timelineScale: Date[] = [];
    for (let i = 0; i <= totalDays; i += Math.ceil(totalDays / 10)) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + i);
      timelineScale.push(date);
    }

    // Position tasks
    const positionedTasks = tasks.map((task) => {
      const taskStart = task.start_date ? new Date(task.start_date) : new Date(task.due_date);
      const taskEnd = new Date(task.due_date);
      const startOffset = differenceInDays(taskStart, minDate);
      const duration = differenceInDays(taskEnd, taskStart) || 1;

      return {
        ...task,
        startPercent: (startOffset / totalDays) * 100,
        widthPercent: (duration / totalDays) * 100,
      };
    });

    return { minDate, maxDate, totalDays, timelineScale, positionedTasks };
  }, [tasks]);

  if (!timelineData) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No tasks to display in timeline view. Add tasks with due dates to see the timeline.
      </div>
    );
  }

  const { timelineScale, positionedTasks } = timelineData;

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "todo":
        return "bg-status-todo";
      case "in_progress":
        return "bg-status-in-progress";
      case "done":
        return "bg-status-done";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-6">
      {/* Timeline header */}
      <div className="border-b pb-2">
        <div className="flex justify-between text-xs text-muted-foreground px-4">
          {timelineScale.map((date, i) => (
            <div key={i} className="text-center">
              {format(date, "MMM dd")}
            </div>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {positionedTasks.map((task) => (
          <div key={task.id} className="flex items-center gap-4">
            {/* Task info */}
            <div className="w-64 flex-shrink-0">
              <p className="font-medium text-sm truncate">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                Due {format(new Date(task.due_date), "MMM dd, yyyy")}
              </p>
            </div>

            {/* Timeline bar */}
            <div className="flex-1 relative h-8">
              <div
                className={cn(
                  "absolute h-6 rounded-md flex items-center px-2 text-xs font-medium text-white transition-all hover:opacity-80 cursor-pointer",
                  getStatusColor(task.status)
                )}
                style={{
                  left: `${task.startPercent}%`,
                  width: `${Math.max(task.widthPercent, 2)}%`,
                }}
                title={`${task.title} - ${task.status}`}
              >
                <span className="truncate">{task.title}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

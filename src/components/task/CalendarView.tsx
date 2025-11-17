import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => isSameDay(new Date(task.due_date), day));
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{format(currentMonth, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}

            {days.map((day, idx) => {
              const dayTasks = getTasksForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={idx}
                  className={`min-h-24 p-2 border rounded ${
                    !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
                  } ${isToday ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="text-sm font-medium mb-1">{format(day, "d")}</div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="text-xs p-1 rounded cursor-pointer hover:bg-accent transition-colors line-clamp-1"
                      >
                        <Badge
                          variant="outline"
                          className={
                            task.status === "done"
                              ? "bg-status-done/10 text-status-done border-status-done"
                              : task.status === "in_progress"
                              ? "bg-status-in-progress/10 text-status-in-progress border-status-in-progress"
                              : "bg-status-todo/10 text-status-todo border-status-todo"
                          }
                        >
                          {task.title}
                        </Badge>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

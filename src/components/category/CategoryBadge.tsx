import { Badge } from "@/components/ui/badge";

interface CategoryBadgeProps {
  name: string;
  color: string;
  className?: string;
}

export function CategoryBadge({ name, color, className = "" }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={`border-2 ${className}`}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}20`,
      }}
    >
      {name}
    </Badge>
  );
}

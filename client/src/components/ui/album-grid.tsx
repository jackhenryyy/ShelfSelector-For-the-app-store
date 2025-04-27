import { ReactNode } from "react";

interface AlbumGridProps {
  children: ReactNode;
  className?: string;
  columns?: number;
  gap?: "small" | "medium" | "large";
}

export function AlbumGrid({
  children,
  className = "",
  columns = 3,
  gap = "medium",
}: AlbumGridProps) {
  // Handle different column counts dynamically
  let columnsClass = "";
  
  // Predefined column classes for common values
  const columnMap: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
    9: "grid-cols-9",
    10: "grid-cols-10",
    12: "grid-cols-12",
  };
  
  // Use predefined class if available, otherwise use responsive grid
  columnsClass = columnMap[columns] || `grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 12)}`;

  const gapClass = {
    small: "gap-1",
    medium: "gap-2",
    large: "gap-4",
  }[gap];

  return (
    <div className={`grid ${columnsClass} ${gapClass} ${className}`}>
      {children}
    </div>
  );
}

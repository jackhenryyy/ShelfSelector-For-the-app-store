import { ReactNode } from "react";

interface AlbumGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
  gap?: "small" | "medium" | "large";
}

export function AlbumGrid({
  children,
  className = "",
  columns = 3,
  gap = "medium",
}: AlbumGridProps) {
  const columnsClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];

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

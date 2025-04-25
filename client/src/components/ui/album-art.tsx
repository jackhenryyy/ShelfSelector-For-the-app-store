import { forwardRef } from "react";

export interface AlbumArtProps {
  src: string;
  alt: string;
  className?: string;
  size?: "small" | "medium" | "large";
  onClick?: () => void;
}

export const AlbumArt = forwardRef<HTMLImageElement, AlbumArtProps>(
  ({ src, alt, className = "", size = "medium", onClick }, ref) => {
    const sizeClasses = {
      small: "w-12 h-12",
      medium: "w-full",
      large: "w-80 h-80",
    }[size];

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={`album-art rounded shadow-sm ${sizeClasses} ${
          onClick ? "cursor-pointer" : ""
        } ${className}`}
        onClick={onClick}
      />
    );
  }
);

AlbumArt.displayName = "AlbumArt";

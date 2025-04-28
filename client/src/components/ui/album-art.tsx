import { forwardRef } from "react";

export interface AlbumArtProps {
  src: string;
  alt: string;
  className?: string;
  size?: "smaller" | "small" | "medium" | "large";
  onClick?: () => void;
}

export const AlbumArt = forwardRef<HTMLImageElement, AlbumArtProps>(
  ({ src, alt, className = "", size = "medium", onClick }, ref) => {
    const sizeClasses = {
      smaller: "w-10 h-10", // Tiny size for mobile
      small: "w-12 h-12 sm:w-12 sm:h-12", // Slightly larger on mobile
      medium: "w-full",
      large: "w-full h-full object-cover",
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

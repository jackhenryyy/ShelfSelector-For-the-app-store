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
      small: "w-10 h-10 sm:w-12 sm:h-12",
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

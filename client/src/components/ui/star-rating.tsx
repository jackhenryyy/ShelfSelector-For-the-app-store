import { useState } from "react";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "small" | "medium" | "large";
  onChange?: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "medium",
  onChange,
  readonly = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClass = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5",
  }[size];

  const handleMouseEnter = (index: number) => {
    if (readonly) return;
    setHoverRating(index);
  };

  const handleMouseLeave = () => {
    if (readonly) return;
    setHoverRating(0);
  };

  const handleClick = (index: number) => {
    if (readonly) return;
    onChange?.(index);
  };

  return (
    <div className="inline-flex">
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = hoverRating ? starValue <= hoverRating : starValue <= rating;
        
        return (
          <span
            key={index}
            className={`${sizeClass} ${
              isFilled ? "text-black" : "text-gray-300"
            } ${!readonly ? "cursor-pointer" : ""}`}
            onMouseEnter={() => handleMouseEnter(starValue)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starValue)}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

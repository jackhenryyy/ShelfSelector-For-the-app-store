import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: "small" | "medium" | "large";
  readonly?: boolean;
}

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "medium",
  readonly = false,
}: StarRatingProps) {
  const sizeClassName = {
    small: "w-3 h-3",
    medium: "w-5 h-5",
    large: "w-6 h-6",
  }[size];
  
  const handleClick = (newValue: number) => {
    if (readonly) return;
    
    // Allow toggling off if same star clicked
    if (newValue === value) {
      onChange?.(0);
    } else {
      onChange?.(newValue);
    }
  };
  
  return (
    <div className="flex">
      {Array.from({ length: max }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= value;
        
        return (
          <button
            key={i}
            type="button"
            onClick={() => handleClick(starValue)}
            className={`${readonly ? "" : "cursor-pointer"} focus:outline-none`}
            disabled={readonly}
            aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
          >
            <Star
              className={`${sizeClassName} ${
                isFilled ? "fill-black text-black" : "text-gray-300"
              } transition-colors`}
            />
          </button>
        );
      })}
    </div>
  );
}
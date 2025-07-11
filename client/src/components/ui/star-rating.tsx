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
  
  const handleStarClick = (starIndex: number, isLeftHalf: boolean) => {
    if (readonly) return;
    
    const newValue = starIndex + (isLeftHalf ? 0.5 : 1);
    
    // Allow toggling off if same value clicked
    if (newValue === value) {
      onChange?.(0);
    } else {
      onChange?.(newValue);
    }
  };
  
  return (
    <div className="flex">
      {Array.from({ length: max }).map((_, i) => {
        const starIndex = i;
        const fullStarValue = starIndex + 1;
        const halfStarValue = starIndex + 0.5;
        
        // Determine fill state
        const isFullyFilled = value >= fullStarValue;
        const isHalfFilled = value >= halfStarValue && value < fullStarValue;
        const isEmpty = value < halfStarValue;
        
        return (
          <div
            key={i}
            className="relative"
          >
            {/* Background star (empty state) */}
            <Star
              className={`${sizeClassName} text-gray-300 transition-colors`}
            />
            
            {/* Half-filled overlay */}
            {isHalfFilled && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star
                  className={`${sizeClassName} fill-black text-black transition-colors`}
                />
              </div>
            )}
            
            {/* Fully filled overlay */}
            {isFullyFilled && (
              <div className="absolute inset-0">
                <Star
                  className={`${sizeClassName} fill-black text-black transition-colors`}
                />
              </div>
            )}
            
            {/* Interactive overlay for half-star clicking */}
            {!readonly && (
              <>
                {/* Left half button */}
                <button
                  type="button"
                  onClick={() => handleStarClick(starIndex, true)}
                  className="absolute inset-0 cursor-pointer focus:outline-none"
                  style={{ width: '50%' }}
                  aria-label={`${halfStarValue} star${halfStarValue !== 1 ? "s" : ""}`}
                />
                {/* Right half button */}
                <button
                  type="button"
                  onClick={() => handleStarClick(starIndex, false)}
                  className="absolute inset-0 cursor-pointer focus:outline-none"
                  style={{ left: '50%', width: '50%' }}
                  aria-label={`${fullStarValue} star${fullStarValue !== 1 ? "s" : ""}`}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
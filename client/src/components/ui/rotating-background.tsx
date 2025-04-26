import { useState, useEffect } from "react";
import { BlurredBackground } from "./blurred-background";

interface RotatingBackgroundProps {
  images: string[];
  intensity?: "light" | "medium" | "heavy";
}

/**
 * Component that displays a random album background from the provided images.
 * Instead of rotating automatically, it shows a random image that only changes on page refresh.
 */
export function RotatingBackground({
  images,
  intensity = "medium",
}: RotatingBackgroundProps) {
  // We only need to track the current image, no rotation needed
  const [currentImage, setCurrentImage] = useState("");
  
  useEffect(() => {
    if (!images || images.length === 0) return;

    // Select a random image from the array on component mount
    const randomIndex = Math.floor(Math.random() * images.length);
    setCurrentImage(images[randomIndex]);
    
    // Debug logs
    console.log("Background initialized with random image from collection:", images.length, "images");
    
    // No cleanup needed as we're not setting up any intervals
  }, [images]); // Only depend on images array, not on any state that would cause re-renders

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Static background with the randomly selected image */}
      <div className="absolute inset-0">
        <BlurredBackground imageUrl={currentImage} intensity={intensity} />
      </div>
    </div>
  );
}
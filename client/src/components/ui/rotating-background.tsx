import { useState, useEffect } from "react";
import { BlurredBackground } from "./blurred-background";

interface RotatingBackgroundProps {
  images: string[];
  interval?: number; // rotation interval in milliseconds
  intensity?: "light" | "medium" | "heavy";
}

export function RotatingBackground({
  images,
  interval = 5000, // default to 5 seconds
  intensity = "medium",
}: RotatingBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [currentImage, setCurrentImage] = useState(images[0] || "");
  const [nextImage, setNextImage] = useState("");

  useEffect(() => {
    if (!images || images.length === 0) return;

    // Initialize with the first image
    setCurrentImage(images[0]);
    
    // Set up the interval to rotate through the images
    const timer = setInterval(() => {
      // Trigger fade out effect
      setFadeOut(true);
      
      // Calculate the next index
      const nextIndex = (currentIndex + 1) % images.length;
      
      // Store the next image
      setNextImage(images[nextIndex]);
      
      // Update the current index
      setTimeout(() => {
        setCurrentImage(images[nextIndex]);
        setCurrentIndex(nextIndex);
        setFadeOut(false);
      }, 500); // transition time
      
    }, interval);
    
    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, [images, interval, currentIndex]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <div className={`transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
        <BlurredBackground imageUrl={currentImage} intensity={intensity} />
      </div>
      
      {fadeOut && nextImage && (
        <div className="absolute inset-0 transition-opacity duration-500 opacity-100">
          <BlurredBackground imageUrl={nextImage} intensity={intensity} />
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { BlurredBackground } from "./blurred-background";

interface RotatingBackgroundProps {
  images: string[];
  interval?: number; // rotation interval in milliseconds
  intensity?: "light" | "medium" | "heavy";
}

export function RotatingBackground({
  images,
  interval = 7000, // default to 7 seconds
  intensity = "medium",
}: RotatingBackgroundProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [currentImage, setCurrentImage] = useState("");
  const [nextImage, setNextImage] = useState("");

  useEffect(() => {
    if (!images || images.length === 0) return;

    // Start with a random image for visual interest
    const randomIndex = Math.floor(Math.random() * images.length);
    setCurrentImage(images[randomIndex]);
    setCurrentIndex(randomIndex);
    
    // Debug logs
    console.log("Rotating background initialized with images:", images);
    
    // Set up the interval to rotate through the images
    const timer = setInterval(() => {
      // Trigger fade out effect
      setFadeOut(true);
      
      // Calculate the next index
      const nextIndex = (currentIndex + 1) % images.length;
      
      // Store the next image
      setNextImage(images[nextIndex]);
      
      // Update the current index after transition delay
      setTimeout(() => {
        setCurrentImage(images[nextIndex]);
        setCurrentIndex(nextIndex);
        setFadeOut(false);
      }, 750); // transition time
      
    }, interval);
    
    // Clean up the interval on component unmount
    return () => clearInterval(timer);
  }, [images, interval, currentIndex]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Current image */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        style={{ zIndex: fadeOut ? 1 : 2 }}
      >
        <BlurredBackground imageUrl={currentImage} intensity={intensity} />
      </div>
      
      {/* Next image (pre-loaded) */}
      {nextImage && (
        <div 
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${fadeOut ? 'opacity-100' : 'opacity-0'}`}
          style={{ zIndex: fadeOut ? 2 : 1 }}
        >
          <BlurredBackground imageUrl={nextImage} intensity={intensity} />
        </div>
      )}
    </div>
  );
}
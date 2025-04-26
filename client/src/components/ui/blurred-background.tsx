import { CSSProperties } from "react";

interface BlurredBackgroundProps {
  imageUrl?: string;
  className?: string;
  intensity?: "light" | "medium" | "heavy";
}

export function BlurredBackground({
  imageUrl,
  className = "",
  intensity = "medium",
}: BlurredBackgroundProps) {
  if (!imageUrl) {
    console.log("BlurredBackground: No image URL provided");
    return null;
  }

  // Map intensity values to actual blur amounts
  const blurIntensity = {
    light: 5,
    medium: 12,
    heavy: 25,
  }[intensity];

  // Base styles for the background container
  const containerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    zIndex: 0
  };

  // Image style with blur effect
  const imageStyle: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    filter: `blur(${blurIntensity}px)`,
    opacity: 0.85,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'scale(1.2)', // Slightly larger to cover edges during blur
    transition: 'opacity 0.5s ease-in-out',
  };

  // Optional overlay gradient for better text readability
  const overlayStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.15) 100%)',
    zIndex: 1
  };

  return (
    <div className={`blurred-bg-container ${className}`} style={containerStyle}>
      <div className="blurred-bg-image" style={imageStyle} />
      <div className="blurred-bg-overlay" style={overlayStyle} />
    </div>
  );
}

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
  
  console.log("BlurredBackground rendering with imageUrl:", imageUrl);

  const blurIntensity = {
    light: 5,
    medium: 10,
    heavy: 20,
  }[intensity];

  const style: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    filter: `blur(${blurIntensity}px)`,
    opacity: 0.9,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 0,
    transform: 'scale(1.1)', // Slightly larger to cover edges during blur
  };

  return <div className={`blurred-bg ${className}`} style={style} />;
}

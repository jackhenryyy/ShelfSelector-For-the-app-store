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
  if (!imageUrl) return null;

  const blurIntensity = {
    light: 10,
    medium: 20,
    heavy: 40,
  }[intensity];

  const style: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    filter: `blur(${blurIntensity}px)`,
    opacity: 0.8,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return <div className={`blurred-bg ${className}`} style={style} />;
}

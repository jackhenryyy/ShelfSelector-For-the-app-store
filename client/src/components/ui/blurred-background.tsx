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
    light: 15,
    medium: 30,
    heavy: 50,
  }[intensity];

  const style: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    filter: `blur(${blurIntensity}px)`,
  };

  return <div className={`blurred-bg ${className}`} style={style} />;
}

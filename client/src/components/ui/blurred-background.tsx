import { CSSProperties } from "react";

interface BlurredBackgroundProps {
  imageUrl?: string;
  className?: string;

  /**
   * Preset blur intensity.
   * (Kept for convenience + backwards compatibility.)
   */
  intensity?: "light" | "medium" | "heavy";

  /**
   * Exact blur amount in pixels.
   * If provided, this overrides `intensity`.
   * Example: blurPx={10} gives a nice "between light and medium" look.
   */
  blurPx?: number;

  /**
   * Opacity of the blurred image layer.
   * Optional tweak if you want the background softer/stronger.
   */
  opacity?: number;

  /**
   * How much to scale the background image so blurred edges don't show.
   */
  scale?: number;
}

export function BlurredBackground({
  imageUrl,
  className = "",
  intensity = "medium",
  blurPx,
  opacity = 0.85,
  scale = 1.2,
}: BlurredBackgroundProps) {
  if (!imageUrl) {
    console.log("BlurredBackground: No image URL provided");
    return null;
  }

  // Map intensity values to blur amounts (in px)
  const intensityMap: Record<NonNullable<BlurredBackgroundProps["intensity"]>, number> = {
    light: 5,
    medium: 12,
    heavy: 25,
  };

  // If blurPx is provided, it wins. Otherwise use the preset.
  const blurIntensity = typeof blurPx === "number" ? blurPx : intensityMap[intensity];

  // Base styles for the background container
  const containerStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    zIndex: 0,
    pointerEvents: "none"
  };

  // Image style with blur effect
  const imageStyle: CSSProperties = {
    backgroundImage: `url(${imageUrl})`,
    filter: `blur(${blurIntensity}px)`,
    opacity,
    backgroundSize: "cover",
    backgroundPosition: "center",
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    transform: `scale(${scale})`,
    transition: "opacity 0.5s ease-in-out",
  };

  // Optional overlay gradient for better text readability
  const overlayStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background:
      "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.15) 100%)",
    zIndex: 1,
  };

  return (
    <div className={`blurred-bg-container ${className}`} style={containerStyle}>
      <div className="blurred-bg-image" style={imageStyle} />
      <div className="blurred-bg-overlay" style={overlayStyle} />
    </div>
  );
}

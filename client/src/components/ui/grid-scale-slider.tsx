import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

interface GridScaleSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showIcon?: boolean;
  className?: string;
}

export function GridScaleSlider({
  value,
  onChange,
  min = 1,
  max = 6,
  step = 1,
  showIcon = true,
  className = "",
}: GridScaleSliderProps) {
  const handleValueChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showIcon && <SlidersHorizontal className="h-4 w-4 opacity-70" />}
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleValueChange}
        className="w-24"
      />
    </div>
  );
}
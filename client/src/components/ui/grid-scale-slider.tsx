import * as SliderPrimitive from "@radix-ui/react-slider";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <SliderPrimitive.Root
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleValueChange}
        className={cn(
          "relative flex w-24 touch-none select-none items-center"
        )}
      >
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden border border-black bg-white">
          <SliderPrimitive.Range className="absolute h-full bg-black" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-4 w-4 rounded-none border border-black bg-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50" />
      </SliderPrimitive.Root>
    </div>
  );
}
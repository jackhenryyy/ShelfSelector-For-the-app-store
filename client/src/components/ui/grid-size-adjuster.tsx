import { Minus, Plus, Grid2X2, Grid3X3 } from "lucide-react";

interface GridSizeAdjusterProps {
  gridSize: number;
  onChange: (size: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function GridSizeAdjuster({
  gridSize,
  onChange,
  min = 1,
  max = 6,
  className = ""
}: GridSizeAdjusterProps) {
  const handleDecrease = () => {
    if (gridSize > min) {
      onChange(gridSize - 1);
    }
  };

  const handleIncrease = () => {
    if (gridSize < max) {
      onChange(gridSize + 1);
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <button
        onClick={handleDecrease}
        disabled={gridSize <= min}
        className={`p-1 rounded-full ${gridSize <= min ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
        title="Fewer columns"
      >
        <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
      
      <div className="flex items-center">
        <Grid3X3 className={`h-3 w-3 sm:h-4 sm:w-4 ${gridSize <= 3 ? 'text-gray-300' : 'text-gray-600'}`} />
      </div>
      
      <button
        onClick={handleIncrease}
        disabled={gridSize >= max}
        className={`p-1 rounded-full ${gridSize >= max ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
        title="More columns"
      >
        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
      </button>
    </div>
  );
}
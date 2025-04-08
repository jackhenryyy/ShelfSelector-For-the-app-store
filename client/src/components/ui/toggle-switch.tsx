import { useState } from "react";

interface ToggleSwitchProps {
  leftLabel: string;
  rightLabel: string;
  defaultChecked?: boolean;
  onChange?: (isRightSelected: boolean) => void;
}

export function ToggleSwitch({ 
  leftLabel, 
  rightLabel, 
  defaultChecked = false, 
  onChange 
}: ToggleSwitchProps) {
  const [isChecked, setIsChecked] = useState(defaultChecked);

  const handleToggle = (value: boolean) => {
    setIsChecked(value);
    onChange?.(value);
  };

  return (
    <div className="flex">
      <button 
        className={`px-4 py-1 font-mono text-sm border border-black
          ${!isChecked ? 'bg-green-300 text-black' : 'bg-white text-black'}
        `}
        onClick={() => handleToggle(false)}
      >
        {leftLabel}
      </button>
      <button
        className={`px-4 py-1 font-mono text-sm border border-l-0 border-black
          ${isChecked ? 'bg-white text-black' : 'bg-white text-black/50'}
        `}
        onClick={() => handleToggle(true)}
      >
        {rightLabel}
      </button>
    </div>
  );
}

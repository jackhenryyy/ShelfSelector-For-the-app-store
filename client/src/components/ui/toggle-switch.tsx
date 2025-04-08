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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsChecked(e.target.checked);
    onChange?.(e.target.checked);
  };

  return (
    <label className="relative inline-block w-36 h-6">
      <input 
        type="checkbox" 
        className="opacity-0 w-0 h-0" 
        checked={isChecked}
        onChange={handleChange}
      />
      <div className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-100 transition duration-300 rounded-full flex items-center justify-between px-1">
        <span className="text-xs z-10 pl-2">{leftLabel}</span>
        <span className="text-xs z-10 pr-2">{rightLabel}</span>
        <div 
          className={`absolute h-[22px] w-[68px] bg-white transition-transform duration-300 rounded-full ${
            isChecked ? 'transform translate-x-[66px]' : 'transform translate-x-[1px]'
          }`}
        />
      </div>
    </label>
  );
}

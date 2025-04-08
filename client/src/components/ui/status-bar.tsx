import { WifiIcon, BatteryIcon, SignalIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function StatusBar() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Update time initially
    updateTime();
    
    // Set interval to update time every minute
    const interval = setInterval(updateTime, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  function updateTime() {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    setTime(formattedTime);
  }

  return (
    <div className="status-bar">
      <div className="text-sm">{time}</div>
      <div className="flex gap-1">
        <SignalIcon className="w-4 h-4" />
        <WifiIcon className="w-4 h-4" />
        <BatteryIcon className="w-4 h-4" />
      </div>
    </div>
  );
}

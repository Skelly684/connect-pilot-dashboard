import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";

export const ElectricBolts = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isActive, setIsActive] = useState(false);
  
  const isSpecialUser = user?.email === 'scttskelly@gmail.com';
  const isDark = theme === 'dark';
  
  useEffect(() => {
    if (!isSpecialUser || !isDark) return;
    
    // Trigger every 60 seconds
    const interval = setInterval(() => {
      setIsActive(true);
      
      // Deactivate after 5 seconds
      setTimeout(() => {
        setIsActive(false);
      }, 5000);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [isSpecialUser, isDark]);
  
  if (!isSpecialUser || !isDark || !isActive) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Screen flash effect */}
      <div className="absolute inset-0 bg-white animate-lightning-flash"></div>
      
      {/* Main lightning bolt - diagonal from top left to bottom right */}
      <div className="absolute top-0 left-[10%] w-full h-full opacity-0 animate-main-lightning">
        {/* Core bolt */}
        <div className="absolute top-0 left-0 w-2 h-[150%] bg-white origin-top rotate-[35deg] shadow-[0_0_40px_10px_rgba(147,51,234,0.8),0_0_80px_20px_rgba(147,51,234,0.5)]">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-200 to-white blur-sm"></div>
        </div>
        
        {/* Branch 1 - upper left */}
        <div className="absolute top-[15%] left-[5%] w-1.5 h-[35%] bg-white origin-top rotate-[15deg] opacity-0 animate-branch-1">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-200 to-transparent blur-sm shadow-[0_0_30px_8px_rgba(147,51,234,0.7)]"></div>
        </div>
        
        {/* Branch 2 - upper middle */}
        <div className="absolute top-[20%] left-[8%] w-1 h-[25%] bg-white origin-top rotate-[55deg] opacity-0 animate-branch-2">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-300 to-transparent blur-sm shadow-[0_0_25px_6px_rgba(147,51,234,0.6)]"></div>
        </div>
        
        {/* Branch 3 - middle left long */}
        <div className="absolute top-[35%] left-[15%] w-1.5 h-[45%] bg-white origin-top rotate-[25deg] opacity-0 animate-branch-3">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-violet-200 to-transparent blur-sm shadow-[0_0_35px_9px_rgba(147,51,234,0.75)]"></div>
        </div>
        
        {/* Branch 4 - middle right */}
        <div className="absolute top-[40%] left-[20%] w-1 h-[30%] bg-white origin-top rotate-[50deg] opacity-0 animate-branch-4">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-300 to-transparent blur-sm shadow-[0_0_28px_7px_rgba(147,51,234,0.65)]"></div>
        </div>
        
        {/* Branch 5 - lower left large */}
        <div className="absolute top-[55%] left-[28%] w-2 h-[40%] bg-white origin-top rotate-[20deg] opacity-0 animate-branch-5">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-200 to-transparent blur-sm shadow-[0_0_40px_10px_rgba(147,51,234,0.8)]"></div>
        </div>
        
        {/* Branch 6 - lower middle */}
        <div className="absolute top-[60%] left-[32%] w-1 h-[28%] bg-white origin-top rotate-[60deg] opacity-0 animate-branch-6">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-violet-300 to-transparent blur-sm shadow-[0_0_30px_8px_rgba(147,51,234,0.7)]"></div>
        </div>
        
        {/* Branch 7 - lower right */}
        <div className="absolute top-[70%] left-[38%] w-1.5 h-[35%] bg-white origin-top rotate-[40deg] opacity-0 animate-branch-7">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-200 to-transparent blur-sm shadow-[0_0_32px_8px_rgba(147,51,234,0.72)]"></div>
        </div>
        
        {/* Branch 8 - far right */}
        <div className="absolute top-[48%] left-[25%] w-1 h-[30%] bg-white origin-top rotate-[65deg] opacity-0 animate-branch-8">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-purple-300 to-transparent blur-sm shadow-[0_0_26px_6px_rgba(147,51,234,0.6)]"></div>
        </div>
        
        {/* Branch 9 - upper right small */}
        <div className="absolute top-[25%] left-[12%] w-0.5 h-[20%] bg-white origin-top rotate-[70deg] opacity-0 animate-branch-9">
          <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-300 to-transparent blur-sm shadow-[0_0_20px_5px_rgba(147,51,234,0.55)]"></div>
        </div>
      </div>
      
      {/* Intense pulsing glow effect */}
      <div className="absolute inset-0 bg-purple-400/20 animate-pulse-intense"></div>
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-purple-500/40 via-transparent to-transparent animate-pulse-intense"></div>
    </div>
  );
};

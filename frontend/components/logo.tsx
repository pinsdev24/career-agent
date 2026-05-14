import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: "default" | "white";
}

export function Logo({ className = "", iconOnly = false, variant = "default" }: LogoProps) {
  const isWhite = variant === "white";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-7 h-7 rounded-tl-lg rounded-br-lg flex items-center justify-center shrink-0 transition-colors ${
        isWhite 
          ? "bg-white" 
          : "bg-[#111111] dark:bg-white"
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
          isWhite 
            ? "bg-[#111111]" 
            : "bg-[#FDFDFC] dark:bg-[#111111]"
        }`} />
      </div>
      {!iconOnly && (
        <span className={`font-bold text-md tracking-tight transition-colors ${
          isWhite 
            ? "text-white" 
            : "text-[#111111] dark:text-white"
        }`}>
          Ariadne
        </span>
      )}
    </div>
  );
}

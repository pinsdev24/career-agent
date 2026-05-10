import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = "", iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-7 h-7 bg-[#111111] rounded-tl-lg rounded-br-lg flex items-center justify-center shrink-0">
        <div className="w-2.5 h-2.5 bg-[#FDFDFC] rounded-full" />
      </div>
      {!iconOnly && (
        <span className="font-bold text-md tracking-tight text-[#111111]">Ariadne</span>
      )}
    </div>
  );
}

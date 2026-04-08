import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className = "", iconOnly = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-[#111111] rounded-tl-xl rounded-br-xl flex items-center justify-center shrink-0">
        <div className="w-3 h-3 bg-[#FDFDFC] rounded-full" />
      </div>
      {!iconOnly && (
        <span className="font-bold text-xl tracking-tight text-[#111111]">Ariadne</span>
      )}
    </div>
  );
}

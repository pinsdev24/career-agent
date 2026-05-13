"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 dark:border-[#333]">
        <div className="h-4 w-4" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#111] transition-all text-[#111] dark:text-white"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 animate-in zoom-in duration-300" />
      ) : (
        <Moon className="h-4 w-4 animate-in zoom-in duration-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

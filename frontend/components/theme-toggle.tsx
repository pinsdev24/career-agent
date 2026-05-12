"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const btnClass = (active: boolean) =>
    `flex items-center justify-center p-2 rounded-md transition-all ${
      active
        ? "bg-background shadow-sm text-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
      <button onClick={() => setTheme("light")} className={btnClass(theme === "light")}>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Light</span>
      </button>
      <button onClick={() => setTheme("system")} className={btnClass(theme === "system")}>
        <Monitor className="h-4 w-4" />
        <span className="sr-only">System</span>
      </button>
      <button onClick={() => setTheme("dark")} className={btnClass(theme === "dark")}>
        <Moon className="h-4 w-4" />
        <span className="sr-only">Dark</span>
      </button>
    </div>
  );
}

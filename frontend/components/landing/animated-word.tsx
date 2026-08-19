"use client";

import React from "react";

export function AnimatedWord({ words, interval = 2800 }: { words: string[]; interval?: number }) {
  const [index, setIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (words.length < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 180);
    }, interval);

    return () => window.clearInterval(id);
  }, [words.length, interval]);

  const word = words[index] ?? "";

  return (
    <span className="relative inline-block">
      <span className={`inline-flex ${visible ? "" : "opacity-0"} transition-opacity duration-200`}>
        {word.split("").map((char, i) => (
          <span
            key={`${word}-${i}`}
            className="animate-char-in inline-block"
            style={{ animationDelay: `${i * 45}ms` }}
          >
            {char}
          </span>
        ))}
      </span>
      <span className="absolute right-0 -bottom-2 left-0 h-3 bg-foreground/10" />
    </span>
  );
}

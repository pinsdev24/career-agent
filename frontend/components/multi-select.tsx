"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MultiSelectOption = {
  value: string;
  label: string;
};

export function MultiSelect({
  values,
  onChange,
  options,
  placeholder,
  disabled,
  hint,
  emptyLabel,
  allowCustom,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder: string;
  disabled?: boolean;
  hint?: string;
  emptyLabel?: string;
  allowCustom?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = useMemo(() => {
    const labels = new Map(options.map((o) => [o.value, o.label]));
    return values.map((value) => ({
      value,
      label: labels.get(value) || value,
    }));
  }, [options, values]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((option) => {
      if (values.includes(option.value)) return false;
      if (!q) return true;
      return (
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
      );
    });
  }, [options, query, values]);

  const add = (value: string) => {
    const next = value.trim();
    if (!next || values.includes(next)) return;
    onChange([...values, next]);
    setQuery("");
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-[#FAFAFA] px-2 py-1.5 dark:bg-[#161616]",
          disabled
            ? "cursor-not-allowed border-[#EBEBEB] opacity-60 dark:border-[#333]"
            : "border-[#EBEBEB] focus-within:border-[#1a1a1a] dark:border-[#333] dark:focus-within:border-white"
        )}
      >
        {selected.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(values.filter((v) => v !== item.value))}
            className="inline-flex items-center gap-1 rounded-md bg-[#1a1a1a] px-1.5 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-black"
          >
            {item.label}
            <X className="h-3 w-3" />
          </button>
        ))}
        <input
          value={query}
          disabled={disabled}
          placeholder={selected.length ? "" : placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !query && values.length) {
              onChange(values.slice(0, -1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) add(filtered[0].value);
              else if (allowCustom && query.trim()) add(query.trim());
            }
            if (e.key === "Escape") setOpen(false);
          }}
          className="min-w-[8rem] flex-1 bg-transparent text-[13px] outline-none dark:text-white"
        />
      </div>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#EBEBEB] bg-white py-1 shadow-md dark:border-[#333] dark:bg-[#111]">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-[12px] text-[#888]">
              {allowCustom && query.trim()
                ? query.trim()
                : emptyLabel || placeholder}
            </p>
          ) : (
            filtered.slice(0, 40).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => add(option.value)}
                className="flex w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#F5F5F5] dark:hover:bg-[#1c1c1c]"
              >
                {option.label}
              </button>
            ))
          )}
          {allowCustom && query.trim() && !filtered.some((o) => o.value.toLowerCase() === query.trim().toLowerCase()) ? (
            <button
              type="button"
              onClick={() => add(query.trim())}
              className="flex w-full px-3 py-1.5 text-left text-[13px] text-[#666] hover:bg-[#F5F5F5] dark:text-[#aaa] dark:hover:bg-[#1c1c1c]"
            >
              {query.trim()}
            </button>
          ) : null}
        </div>
      )}
      {hint ? (
        <p className="mt-1 text-[11px] text-[#999] dark:text-[#888]">{hint}</p>
      ) : null}
    </div>
  );
}

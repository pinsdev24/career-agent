"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { useLocale } from "next-intl";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setUserLocale } from "@/lib/i18n/locale";

const LANGUAGES = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "nl", label: "Nederlands", flag: "🇳🇱" },
] as const;

export function LanguageToggle() {
  const currentLocale = useLocale();

  const handleLanguageChange = async (locale: string) => {
    await setUserLocale(locale);
    
    // If we are on a localized route like /[locale], we should redirect to the new locale path
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/');
    // Check if the first segment is a valid locale
    const currentLocale = pathSegments[1];
    const isLocalizedPath = ["en", "fr", "nl"].includes(currentLocale);

    if (isLocalizedPath) {
      pathSegments[1] = locale;
      window.location.href = pathSegments.join('/') || '/';
    } else {
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#222] transition-all text-[#111] dark:text-white outline-none focus-visible:ring-1 focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white"
        title="Change language"
      >
        <Globe className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
        <span className="sr-only">Toggle language</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-[#111] border-gray-200 dark:border-[#333] p-1">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.value}
            onClick={() => handleLanguageChange(lang.value)}
            className={`cursor-pointer px-3 py-2 rounded-md text-[13px] transition-colors dark:hover:bg-[#222] ${
              currentLocale === lang.value 
                ? "bg-[#F5F5F5] dark:bg-[#222] text-[#1a1a1a] dark:text-white font-semibold" 
                : "text-[#666] dark:text-[#aaa] hover:text-[#1a1a1a] dark:hover:text-white"
            }`}
          >
            <span className="mr-2 text-base">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

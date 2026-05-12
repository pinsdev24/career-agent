"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Check, Loader2, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LetterEditorProps {
  initialLetter: string;
  onSubmit: (editedLetter: string, approved: boolean, userFeedback?: string) => void;
  loading?: boolean;
}

export function LetterEditor({ initialLetter, onSubmit, loading }: LetterEditorProps) {
  const t = useTranslations("LetterEditor");
  const [content, setContent] = useState(initialLetter);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  const handleRewrite = () => {
    if (!showFeedback) {
      setShowFeedback(true);
      return;
    }
    onSubmit(content, false, feedback);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5] dark:border-[#222] bg-[#FAFAFA] dark:bg-[#111]">
        <span className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">{t("title")}</span>
        <span className="text-[11px] font-mono text-[#999] dark:text-[#888] bg-[#F5F5F5] dark:bg-[#222] px-2 py-0.5 rounded">
          {t("chars", { count: content.length })}
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[400px] text-[14px] leading-relaxed px-6 py-4 resize-none rounded-none bg-white dark:bg-[#111] text-[#1a1a1a] dark:text-white border-0 focus:border-0 focus-visible:ring-0 selection:bg-blue-100 dark:selection:bg-blue-900/50 placeholder:text-[#ddd] dark:placeholder:text-[#555]"
        placeholder={t("placeholder")}
        disabled={loading}
      />

      <div className="p-4 space-y-3 border-t border-[#F5F5F5] dark:border-[#222]">
        {showFeedback && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ccc]" />
              <Input
                placeholder={t("feedback_placeholder")}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-9 pl-9 text-[13px] text-[#1a1a1a] dark:text-white bg-white dark:bg-[#111] rounded-lg border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRewrite();
                }}
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#999] dark:text-[#888] hidden sm:block">
            {t("helper")}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleRewrite}
              disabled={loading}
              className="rounded-lg border-[#EBEBEB] dark:border-[#333] h-9 px-4 text-[12px] font-medium text-[#666] dark:text-[#aaa] hover:bg-[#F5F5F5] dark:hover:bg-[#222] hover:text-[#1a1a1a] dark:hover:text-white gap-1.5"
            >
              {loading && showFeedback ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {showFeedback ? t("send") : t("rewrite")}
            </Button>

            <Button
              onClick={() => onSubmit(content, true)}
              disabled={loading}
              className="rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-black h-9 px-5 text-[12px] font-medium hover:bg-[#333] dark:hover:bg-[#e5e5e5] gap-1.5 shadow-sm"
            >
              {loading && !showFeedback ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t("approve")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

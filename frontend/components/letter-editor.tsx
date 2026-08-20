"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, RotateCcw } from "lucide-react";

interface LetterEditorProps {
  initialLetter: string;
  onSubmit: (editedLetter: string, approved: boolean, userFeedback?: string) => void;
  loading?: boolean;
  revisionCount?: number;
}

export function LetterEditor({
  initialLetter,
  onSubmit,
  loading,
  revisionCount = 0,
}: LetterEditorProps) {
  const t = useTranslations("LetterEditor");
  const [content, setContent] = useState(initialLetter);
  const [feedback, setFeedback] = useState("");
  const [action, setAction] = useState<"rewrite" | "approve" | null>(null);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  useEffect(() => {
    setContent(initialLetter);
  }, [initialLetter]);

  useEffect(() => {
    if (!loading) setAction(null);
  }, [loading]);

  const run = (approved: boolean) => {
    setAction(approved ? "approve" : "rewrite");
    onSubmit(content, approved, approved ? undefined : feedback.trim() || undefined);
  };

  return (
    <div className="flex min-h-[min(70vh,720px)] flex-col">
      <div className="flex items-end justify-between gap-3 px-6 pb-2 pt-5 sm:px-8">
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
            {t("title")}
          </p>
          {revisionCount > 0 && (
            <p className="mt-0.5 text-[12px] text-[#888]">
              {t("revision", { count: revisionCount })}
            </p>
          )}
        </div>
        <span className="text-[12px] tabular-nums text-[#999]">
          {t("words", { count: words })}
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[360px] flex-1 resize-none rounded-none border-0 bg-transparent px-6 py-4 text-[15px] leading-[1.75] text-[#1a1a1a] placeholder:text-[#ddd] focus:border-0 focus-visible:ring-0 dark:bg-transparent dark:text-white dark:placeholder:text-[#555] sm:px-8"
        placeholder={t("placeholder")}
        disabled={loading}
      />

      <div className="sticky bottom-0 space-y-3 border-t border-[#F0F0F0] bg-white/95 px-5 py-4 backdrop-blur dark:border-[#222] dark:bg-[#111]/95 sm:px-6">
        <div>
          <label
            htmlFor="letter-rewrite-notes"
            className="mb-1.5 block text-[12px] font-medium text-[#1a1a1a] dark:text-white"
          >
            {t("notes_label")}
          </label>
          <Textarea
            id="letter-rewrite-notes"
            placeholder={t("feedback_placeholder")}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[72px] resize-none rounded-xl border-[#EBEBEB] bg-white text-[13px] leading-relaxed dark:border-[#333] dark:bg-[#161616]"
            disabled={loading}
          />
        </div>
        <div className="flex flex-col-reverse items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <p className="text-[11px] leading-relaxed text-[#999] sm:max-w-[280px]">
            {t("helper")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => run(false)}
              disabled={loading}
              className="h-9 rounded-lg border-[#EBEBEB] px-4 text-[12px] font-medium text-[#555] hover:bg-[#F5F5F5] dark:border-[#333] dark:text-[#aaa] dark:hover:bg-[#222]"
            >
              {action === "rewrite" && loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {t("rewrite")}
            </Button>
            <Button
              onClick={() => run(true)}
              disabled={loading}
              className="h-9 rounded-lg bg-[#1a1a1a] px-5 text-[12px] font-medium text-white shadow-sm hover:bg-[#333] dark:bg-white dark:text-black dark:hover:bg-[#e5e5e5]"
            >
              {action === "approve" && loading ? (
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

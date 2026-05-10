"use client";

import { useState } from "react";
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F5] bg-[#FAFAFA]">
        <span className="text-[13px] font-medium text-[#1a1a1a]">Draft Editor</span>
        <span className="text-[11px] font-mono text-[#999] bg-[#F5F5F5] px-2 py-0.5 rounded">
          {content.length} chars
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[400px] text-[14px] leading-relaxed px-6 py-4 resize-none rounded-none bg-white border-0 focus:border-0 focus-visible:ring-0 selection:bg-blue-100 placeholder:text-[#ddd]"
        placeholder="Drafting..."
        disabled={loading}
      />

      <div className="p-4 space-y-3 border-t border-[#F5F5F5]">
        {showFeedback && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#ccc]" />
              <Input
                placeholder="e.g. emphasize leadership experience..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-9 pl-9 text-[13px] bg-white rounded-lg border-[#EBEBEB] focus-visible:ring-[#1a1a1a]"
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
          <span className="text-[11px] text-[#999] hidden sm:block">
            Edit the letter above, then approve or request a rewrite.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={handleRewrite}
              disabled={loading}
              className="rounded-lg border-[#EBEBEB] h-9 px-4 text-[12px] font-medium text-[#666] hover:bg-[#F5F5F5] gap-1.5"
            >
              {loading && showFeedback ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              {showFeedback ? "Send" : "Rewrite"}
            </Button>

            <Button
              onClick={() => onSubmit(content, true)}
              disabled={loading}
              className="rounded-lg bg-[#1a1a1a] text-white h-9 px-5 text-[12px] font-medium hover:bg-[#333] gap-1.5 shadow-sm"
            >
              {loading && !showFeedback ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

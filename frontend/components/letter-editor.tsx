"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenLine, RotateCcw, Check, Loader2, MessageSquare } from "lucide-react";
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
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between px-8 pt-8">
        <div className="space-y-1">
           <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Draft version 0.1</span>
           <h3 className="text-xl font-medium text-[#111111]">Refine Asset</h3>
        </div>
        <div className="text-[10px] font-mono text-gray-400 bg-[#F4F3F0] px-2 py-1 rounded border border-[#E8E6E1]">
          {content.length} CHARS
        </div>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[500px] font-serif text-lg leading-relaxed px-10 py-4 resize-none rounded-[1.5rem] bg-[#FDFDFC] border-transparent focus:border-transparent focus-visible:ring-0 selection:bg-orange-100 placeholder:text-gray-200"
        placeholder="Drafting in progress..."
        disabled={loading}
      />

      <div className="px-8 pb-8 space-y-6">
        {showFeedback && (
          <div className="animate-in slide-in-from-top-2 fade-in duration-500">
            <div className="relative">
              <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Strategic instruction (e.g. emphasize leadership roles)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="h-12 pl-12 bg-white rounded-xl border-[#E8E6E1] focus-visible:ring-[#111111] shadow-sm"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRewrite();
                }}
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 justify-between items-center bg-[#F4F3F0]/50 p-6 rounded-[1.5rem] border border-[#E8E6E1]">
          <div className="text-[11px] uppercase tracking-widest text-gray-400 font-bold max-w-xs leading-relaxed">
            Satisfied? Proceed to finalization. Otherwise, issue a strategic rewrite.
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={handleRewrite}
              disabled={loading}
              className="rounded-full border-[#E8E6E1] bg-white h-12 px-8 text-[11px] font-bold uppercase tracking-widest text-[#111111] hover:bg-[#F4F3F0] transition-all flex-1 md:flex-none"
            >
              {loading && showFeedback ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {showFeedback ? "Confirm Strategy" : "Rewrite"}
            </Button>
            
            <Button
              onClick={() => onSubmit(content, true)}
              disabled={loading}
              className="rounded-full bg-[#111111] text-white h-12 px-8 text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all flex-1 md:flex-none shadow-lg shadow-black/5"
            >
              {loading && !showFeedback ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {loading && !showFeedback ? "VALIDATING..." : "APPROVE ASSET"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

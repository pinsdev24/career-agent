"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenLine, RotateCcw, Check, Loader2 } from "lucide-react";

interface LetterEditorProps {
  initialLetter: string;
  onSubmit: (editedLetter: string, approved: boolean) => void;
  loading?: boolean;
}

export function LetterEditor({ initialLetter, onSubmit, loading }: LetterEditorProps) {
  const [content, setContent] = useState(initialLetter);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2.5">
          <PenLine className="h-5 w-5 text-primary" />
          Draft Cover Letter
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {content.length} characters
        </span>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 min-h-[400px] font-mono text-sm leading-relaxed p-5 resize-none rounded-xl bg-background/50 border-border/60 focus:border-primary/50 focus-visible:ring-1"
        placeholder="Your cover letter here..."
        disabled={loading}
      />

      <div className="flex justify-between items-center bg-card/80 p-4 rounded-xl border border-border/50">
        <div className="text-sm text-balance max-w-sm text-muted-foreground">
          Edit the letter above. When you&apos;re satisfied, click Approve. You can also request a rewrite from the AI.
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onSubmit(content, false)}
            disabled={loading}
            className="gap-2 rounded-xl"
          >
            <RotateCcw className="h-4 w-4" />
            Rewrite
          </Button>
          <Button
            onClick={() => onSubmit(content, true)}
            disabled={loading}
            className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {loading ? "Approving..." : "Approve & Finalize"}
          </Button>
        </div>
      </div>
    </div>
  );
}

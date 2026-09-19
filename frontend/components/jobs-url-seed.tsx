"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { seedJobBoard } from "@/lib/job-engine";

export function JobsUrlSeed({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("Jobs");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "fail">("idle");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setStatus("fail");
      return;
    }
    setBusy(true);
    setStatus("idle");
    try {
      const result = await seedJobBoard(trimmed);
      setStatus(result.ok ? "ok" : "fail");
    } catch {
      setStatus("fail");
    } finally {
      setBusy(false);
    }
  };

  const letterHref = url.trim()
    ? `/pipeline/new?url=${encodeURIComponent(url.trim())}`
    : "/pipeline/new";

  return (
    <form onSubmit={onSubmit} className={compact ? "space-y-2" : "mx-auto mt-5 w-full max-w-md space-y-2"}>
      <label htmlFor="jobs-url-seed" className="sr-only">
        {t("empty_warming_cta")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="jobs-url-seed"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder={t("seed_placeholder")}
          className="h-10 flex-1 rounded-xl bg-[#FAFAFA] font-mono text-[13px] dark:bg-[#0d0d0d]"
        />
        <Button
          type="submit"
          disabled={busy}
          className="h-10 shrink-0 rounded-xl px-4 text-[13px]"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("empty_warming_cta")}
        </Button>
      </div>
      {status === "ok" && (
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400" role="status">
          {t("seed_success")}
        </p>
      )}
      {status === "fail" && (
        <p className="text-[12px] text-red-600 dark:text-red-400" role="alert">
          {t("seed_fail")}
        </p>
      )}
      <Link
        href={letterHref}
        className="block text-[12px] text-[#888] underline-offset-2 hover:text-[#1a1a1a] hover:underline dark:hover:text-white"
      >
        {t("seed_letter")}
      </Link>
    </form>
  );
}

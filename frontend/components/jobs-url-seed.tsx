"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobEngineError, seedJobBoard } from "@/lib/job-engine";

type SeedStatus =
  | "idle"
  | "syncing"
  | "success"
  | "already"
  | "unsupported"
  | "invalid"
  | "error";

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function JobsUrlSeed({
  compact = false,
  inputId = "jobs-url-seed",
  autoFocus = false,
}: {
  compact?: boolean;
  inputId?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("Jobs");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<SeedStatus>("idle");
  const [company, setCompany] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || !isHttpUrl(trimmed)) {
      setStatus("invalid");
      setCompany(null);
      return;
    }
    setStatus("syncing");
    setCompany(null);
    try {
      const result = await seedJobBoard(trimmed);
      if (result.ok) {
        setCompany((result.name || "").trim() || null);
        setStatus(result.created === false ? "already" : "success");
        return;
      }
      setStatus("unsupported");
    } catch (err) {
      setStatus(err instanceof JobEngineError && err.status >= 400 && err.status < 500 ? "invalid" : "error");
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className={compact ? "space-y-2 text-left" : "mx-auto mt-5 w-full max-w-md space-y-2 text-left"}
    >
      <div>
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">
          {t("url_seed_title")}
        </label>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#888]">{t("url_seed_desc")}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          type="url"
          autoFocus={autoFocus}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (status !== "idle" && status !== "syncing") setStatus("idle");
          }}
          placeholder={t("url_seed_placeholder")}
          className="h-10 flex-1 rounded-xl bg-[#FAFAFA] font-mono text-[13px] dark:bg-[#0d0d0d]"
        />
        <Button
          type="submit"
          disabled={status === "syncing"}
          className="h-10 shrink-0 rounded-xl px-4 text-[13px]"
        >
          {status === "syncing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("url_seed_syncing")}
            </>
          ) : (
            t("url_seed_submit")
          )}
        </Button>
      </div>
      {status === "success" && (
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400" role="status">
          {company
            ? t("url_seed_success_named", { company })
            : t("url_seed_success")}
        </p>
      )}
      {status === "already" && (
        <p className="text-[12px] text-emerald-700 dark:text-emerald-400" role="status">
          {t("url_seed_already")}
        </p>
      )}
      {status === "unsupported" && (
        <div className="space-y-1" role="alert">
          <p className="text-[12px] text-red-600 dark:text-red-400">{t("url_seed_unsupported")}</p>
          <p className="text-[12px] text-[#888]">{t("url_seed_unsupported_hint")}</p>
        </div>
      )}
      {status === "invalid" && (
        <p className="text-[12px] text-red-600 dark:text-red-400" role="alert">
          {t("url_seed_invalid")}
        </p>
      )}
      {status === "error" && (
        <p className="text-[12px] text-red-600 dark:text-red-400" role="alert">
          {t("url_seed_error")}
        </p>
      )}
    </form>
  );
}

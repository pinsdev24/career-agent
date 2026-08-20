"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Inbox, Loader2 } from "lucide-react";
import { listApplications, listInbox } from "@/lib/api";
import type { Application, WorkItem } from "@/lib/types";

export default function ApplicationsPage() {
  const t = useTranslations("Applications");
  const [apps, setApps] = useState<Application[]>([]);
  const [inbox, setInbox] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [applicationRows, inboxRows] = await Promise.all([
          listApplications(),
          listInbox(),
        ]);
        setApps(applicationRows);
        setInbox(inboxRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error_generic"));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#999]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-[13px]">{t("generating")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-[13px] text-[#666] dark:text-[#888] mt-1 max-w-xl">
          {t("subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#888]">
          {t("inbox")}
        </h2>
        {inbox.length === 0 ? (
          <p className="text-[13px] text-[#999]">{t("inbox_empty")}</p>
        ) : (
          <div className="space-y-2">
            {inbox.map((item) => (
              <Link
                key={item.id}
                href={item.application_id ? `/applications/${item.application_id}` : "/applications"}
                className="flex items-center gap-3 rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] px-4 py-3"
              >
                <Inbox className="h-4 w-4 text-[#999]" />
                <div>
                  <p className="text-[13px] font-medium">{item.item_type.replace("_", " ")}</p>
                  <p className="text-[12px] text-[#888]">
                    {(item.payload?.title as string) || ""}{" "}
                    {(item.payload?.company as string) || ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {apps.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-[14px] text-[#666]">{t("empty")}</p>
          <p className="text-[12px] text-[#999]">{t("empty_hint")}</p>
          <Link href="/jobs" className="text-[13px] underline underline-offset-2">
            Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/applications/${app.id}`}
              className="block rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium">
                    {app.posting?.title || "Role"}
                  </p>
                  <p className="text-[13px] text-[#888]">{app.posting?.company_name}</p>
                </div>
                <span className="text-[12px] px-2 py-1 rounded-md bg-[#F5F5F5] dark:bg-[#222]">
                  {app.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

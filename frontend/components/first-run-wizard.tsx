"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  CheckCircle2,
  FileCheck,
  Loader2,
  MapPin,
  Upload,
  Wifi,
} from "lucide-react";
import { uploadCV, updatePreferences } from "@/lib/api";
import type { Profile } from "@/lib/types";
import {
  extractedFullName,
  getFirstIncompleteSetupStep,
  hasUploadedCv,
  mergeSearchPreferences,
  REMOTE_PREFERENCE_OPTIONS,
  type FirstRunStep,
  type RemotePreferenceOption,
} from "@/lib/profile-ready";
import { MultiSelect } from "@/components/multi-select";
import {
  COUNTRIES,
  citiesForCountries,
  countryLabel,
  searchCities,
} from "@/lib/geo-catalog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REMOTE_LABEL_KEYS: Record<RemotePreferenceOption, string> = {
  remote: "remote_remote",
  hybrid: "remote_hybrid",
  onsite: "remote_onsite",
};

export function FirstRunWizard({
  open,
  onOpenChange,
  profile,
  onProfileUpdated,
  onSkip,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdated: (profile: Profile) => void;
  onSkip: () => void;
  onFinished: () => void;
}) {
  const t = useTranslations("FirstRun");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<FirstRunStep | "done">(1);
  const [jobTitle, setJobTitle] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [remote, setRemote] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncFromProfile = useCallback((next: Profile | null) => {
    setJobTitle(next?.search_preferences?.job_title?.trim() || "");
    const prefs = next?.search_preferences;
    setCountries((prefs?.countries || []).map((c) => c.toUpperCase()));
    setCities(prefs?.cities || []);
    const modes = prefs?.work_modes || [];
    const remotePref = (prefs?.remote_preference || modes[0] || "").trim();
    setRemote(remotePref);
  }, []);

  useEffect(() => {
    if (!open) return;
    syncFromProfile(profile);
    setError(null);
    setStep(getFirstIncompleteSetupStep(profile) ?? "done");
    // Initialize once per open so a CV upload doesn't kick the user off step 1.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const extractedName = extractedFullName(profile);
  const cvReady = hasUploadedCv(profile);
  const progressStep = step === "done" ? 3 : step;

  const handlePdf = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("step1_error"));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const next = await uploadCV(file);
      onProfileUpdated(next);
    } catch {
      setError(t("step1_error"));
    } finally {
      setUploading(false);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handlePdf(file);
  };

  const saveRole = async () => {
    const title = jobTitle.trim();
    if (!title) {
      setError(t("step2_error"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updatePreferences(
        undefined,
        mergeSearchPreferences(profile?.search_preferences, { job_title: title })
      );
      onProfileUpdated(next);
      setStep(3);
    } catch {
      setError(t("step2_error"));
    } finally {
      setSaving(false);
    }
  };

  const saveWhere = async () => {
    const remotePref = remote.trim();
    if (!countries.length && !remotePref) {
      setError(t("step3_error"));
      return;
    }
    if (remotePref === "onsite" && !countries.length) {
      setError(t("step3_error_country"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const next = await updatePreferences(
        undefined,
        mergeSearchPreferences(profile?.search_preferences, {
          countries,
          cities: countries.length ? cities : [],
          work_modes: remotePref ? [remotePref] : [],
          remote_preference: remotePref,
        })
      );
      onProfileUpdated(next);
      setStep("done");
    } catch {
      setError(t("step3_error"));
    } finally {
      setSaving(false);
    }
  };

  const goToJobs = () => {
    onFinished();
    router.push("/jobs");
  };

  const title =
    step === 1
      ? t("step1_title")
      : step === 2
        ? t("step2_title")
        : step === 3
          ? t("step3_title")
          : t("done_title");

  const description =
    step === 1
      ? t("step1_desc")
      : step === 2
        ? t("step2_desc")
        : step === 3
          ? t("step3_desc")
          : t("done_desc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 sm:max-w-lg dark:bg-[#111]"
      >
        {step !== "done" && (
          <p className="mb-3 text-[13px] font-medium text-[#1a1a1a] dark:text-white">
            {t("title")}
          </p>
        )}
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#999]">
            {t("progress", { current: progressStep, total: 3 })}
          </p>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`h-1.5 w-8 rounded-full ${
                  n <= progressStep
                    ? "bg-[#1a1a1a] dark:bg-white"
                    : "bg-[#EBEBEB] dark:bg-[#333]"
                }`}
              />
            ))}
          </div>
        </div>

        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-tight text-[#1a1a1a] dark:text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-[#666] dark:text-[#888]">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {step === 1 && (
            <div>
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => void onDrop(e)}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
                  dragging
                    ? "border-[#1a1a1a] bg-[#FAFAFA] dark:border-white dark:bg-[#161616]"
                    : "border-[#ddd] dark:border-[#444]"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handlePdf(file);
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-[#1a1a1a] dark:text-white" />
                ) : cvReady ? (
                  <FileCheck className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Upload className="h-6 w-6 text-[#999]" />
                )}
                <p className="mt-3 text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                  {uploading
                    ? t("step1_uploading")
                    : cvReady
                      ? extractedName
                        ? t("step1_success_named", { name: extractedName })
                        : t("step1_success")
                      : t("step1_cta")}
                </p>
              </label>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] text-[#888]">
                <Briefcase className="h-3 w-3" /> {t("step2_label")}
              </Label>
              <Input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={t("step2_placeholder")}
                className="h-10 rounded-lg bg-[#FAFAFA] text-[13px] dark:bg-[#161616]"
                autoFocus
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#888]">
                  <MapPin className="h-3 w-3" /> {t("step3_countries_label")}
                </Label>
                <MultiSelect
                  values={countries}
                  onChange={(next) => {
                    setCountries(next);
                    const allowed = new Set(citiesForCountries(next).map((c) => c.toLowerCase()));
                    setCities((current) =>
                      current.filter((city) => allowed.has(city.toLowerCase()))
                    );
                  }}
                  options={COUNTRIES.map((c) => ({
                    value: c.code,
                    label: countryLabel(c.code, locale),
                  }))}
                  placeholder={t("step3_countries_placeholder")}
                  hint={t("step3_countries_hint")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#888]">{t("step3_cities_label")}</Label>
                <MultiSelect
                  values={cities}
                  onChange={setCities}
                  options={searchCities("", countries).map((city) => ({
                    value: city,
                    label: city,
                  }))}
                  placeholder={
                    countries.length
                      ? t("step3_cities_placeholder")
                      : t("step3_cities_empty_countries")
                  }
                  disabled={!countries.length}
                  allowCustom
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] text-[#888]">
                  <Wifi className="h-3 w-3" /> {t("step3_remote_label")}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {REMOTE_PREFERENCE_OPTIONS.map((option) => {
                    const normalized = remote.trim().toLowerCase();
                    const active =
                      normalized === option ||
                      (option === "remote" && normalized === "fully remote");
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          setRemote((current) => (current === option ? "" : option))
                        }
                        className={`rounded-lg border px-2 py-2.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-[#EBEBEB] bg-white text-[#1a1a1a] hover:border-[#ccc] dark:border-[#333] dark:bg-[#111] dark:text-white"
                        }`}
                      >
                        {t(REMOTE_LABEL_KEYS[option])}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[13px] leading-relaxed text-emerald-800 dark:text-emerald-200">
                {t("done_desc")}
              </p>
            </div>
          )}

          {error && (
            <p className="text-[12px] font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step === "done" ? (
            <span />
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="text-[12px] font-medium text-[#888] hover:text-[#1a1a1a] dark:hover:text-white"
            >
              {t("skip")}
            </button>
          )}
          <div className="flex items-center gap-2">
            {step !== 1 && step !== "done" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  setStep((current) =>
                    current === 3 ? 2 : current === 2 ? 1 : current
                  );
                }}
                className="h-10 rounded-lg px-4 text-[13px]"
              >
                {t("back")}
              </Button>
            )}
            {step === 1 && (
              <Button
                type="button"
                disabled={!cvReady || uploading}
                onClick={() => setStep(2)}
                className="h-10 rounded-lg px-5 text-[13px]"
              >
                {t("continue")}
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveRole()}
                className="h-10 rounded-lg px-5 text-[13px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("continue")}
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                disabled={saving}
                onClick={() => void saveWhere()}
                className="h-10 rounded-lg px-5 text-[13px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("continue")}
              </Button>
            )}
            {step === "done" && (
              <Button
                type="button"
                onClick={goToJobs}
                className="h-10 rounded-lg px-5 text-[13px]"
              >
                {t("done_cta")}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

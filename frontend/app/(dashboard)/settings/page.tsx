"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Save, Check, MapPin, FileText, Wifi, Loader2, Handshake, MessageSquare, Megaphone, BookOpen, AlignLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getProfile, updatePreferences } from "@/lib/api";
import { LanguagePreference } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { setUserLocale } from "@/lib/i18n/locale";
import { useLocale } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const currentLocale = useLocale();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Agent Settings
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState<LanguagePreference>("en");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("");
  const [remote, setRemote] = useState("");

  // App UI Language
  const [uiLanguage, setUiLanguage] = useState<string>(currentLocale);

  const TONES = [
    { value: "professional", label: t("tones.professional.label"), desc: t("tones.professional.desc"), icon: Handshake },
    { value: "conversational", label: t("tones.conversational.label"), desc: t("tones.conversational.desc"), icon: MessageSquare },
    { value: "enthusiastic", label: t("tones.enthusiastic.label"), desc: t("tones.enthusiastic.desc"), icon: Megaphone },
    { value: "formal", label: t("tones.formal.label"), desc: t("tones.formal.desc"), icon: BookOpen },
    { value: "concise", label: t("tones.concise.label"), desc: t("tones.concise.desc"), icon: AlignLeft },
  ];

  const LANGUAGES = [
    { value: "en", label: "English", native: "English", flag: "🇬🇧" },
    { value: "fr", label: "French", native: "Français", flag: "🇫🇷" },
    { value: "nl", label: "Dutch", native: "Nederlands", flag: "🇳🇱" },
  ] as const;

  useEffect(() => {
    async function loadData() {
      try {
        const prof = await getProfile();
        
        if (prof?.language_preference) setLanguage(prof.language_preference);
        if (prof?.tone_of_voice) setTone(prof.tone_of_voice);
        if (prof?.search_preferences) {
          setJobTitle(prof.search_preferences.job_title || "");
          setLocation(prof.search_preferences.location || "");
          setContractType(prof.search_preferences.contract_type || "");
          setRemote(prof.search_preferences.remote_preference || "");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load preferences");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUiLanguageChange = async (newLocale: string) => {
    setUiLanguage(newLocale);
    await setUserLocale(newLocale);
    // Hard refresh to re-render the app with new translations
    window.location.reload();
  };

  const handleSaveAgentPreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updatePreferences(
        tone as any,
        {
          job_title: jobTitle,
          location,
          contract_type: contractType,
          remote_preference: remote
        },
        language
      );
      setSuccess("Preferences saved successfully.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#999] dark:text-[#aaa]" />
        <span className="text-[13px] text-[#999] dark:text-[#aaa]">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white tracking-tight">{t("title")}</h1>
        <p className="text-[13px] text-[#999] dark:text-[#aaa] mt-0.5">{t("subtitle")}</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* App Preferences */}
      <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] dark:border-[#333]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">{t("app_prefs")}</h2>
          <p className="text-[12px] text-[#999] dark:text-[#aaa] mt-0.5">{t("app_prefs_desc")}</p>
        </div>
        
        <div className="p-5 space-y-6">
          {/* UI Language */}
          <div className="space-y-3">
            <Label className="text-[12px] font-medium text-[#666] dark:text-[#888]">{t("ui_lang")}</Label>
            <p className="text-[11px] text-[#999] dark:text-[#aaa] -mt-1">{t("ui_lang_desc")}</p>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const isActive = uiLanguage === lang.value;
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => handleUiLanguageChange(lang.value)}
                    className={`relative rounded-lg border p-3 text-left transition-all duration-200 ${
                      isActive
                        ? "border-[#1a1a1a] bg-[#1a1a1a] dark:border-white dark:bg-white text-white dark:text-black"
                        : "border-[#EBEBEB] dark:border-[#333] hover:border-[#ccc] dark:hover:border-[#555] bg-white dark:bg-[#111] text-[#111] dark:text-white"
                    }`}
                  >
                    <span className="text-xl mb-1.5 block">{lang.flag}</span>
                    <p className="text-[11px] font-medium">{lang.label}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className={`h-3 w-3 ${isActive ? "text-white dark:text-[#111]" : ""}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme */}
          <div className="space-y-3 border-t border-[#F5F5F5] dark:border-[#333] pt-5">
            <Label className="text-[12px] font-medium text-[#666] dark:text-[#888]">{t("theme")}</Label>
            <p className="text-[11px] text-[#999] dark:text-[#aaa] -mt-1">{t("theme_desc")}</p>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Agent Preferences */}
      <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] dark:border-[#333]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">{t("agent_prefs")}</h2>
          <p className="text-[12px] text-[#999] dark:text-[#aaa] mt-0.5">{t("agent_prefs_desc")}</p>
        </div>

        <div className="p-5 space-y-6">
          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-[12px] font-medium text-[#666] dark:text-[#888]">{t("tone")}</Label>
            <p className="text-[11px] text-[#999] dark:text-[#aaa] -mt-1">{t("tone_desc")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TONES.map((tItem) => {
                const Icon = tItem.icon;
                const isActive = tone === tItem.value;
                return (
                  <button
                    key={tItem.value}
                    type="button"
                    onClick={() => setTone(tItem.value)}
                    className={`relative rounded-lg border p-3 text-left transition-all duration-200 ${
                      isActive
                        ? "border-[#1a1a1a] bg-[#1a1a1a] dark:border-white dark:bg-white text-white dark:text-black"
                        : "border-[#EBEBEB] dark:border-[#333] hover:border-[#ccc] dark:hover:border-[#555] bg-white dark:bg-[#111] text-[#111] dark:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-2 ${isActive ? "text-white dark:text-black" : "text-[#ccc] dark:text-[#888]"}`} />
                    <p className="text-[11px] font-medium">{tItem.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/80 dark:text-black/70" : "text-[#999] dark:text-[#888]"}`}>{tItem.desc}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className={`h-3 w-3 ${isActive ? "text-white dark:text-[#111]" : ""}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LLM Language */}
          <div className="space-y-3 border-t border-[#F5F5F5] dark:border-[#333] pt-5">
            <Label className="text-[12px] font-medium text-[#666] dark:text-[#888] flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {t("llm_lang")}
            </Label>
            <p className="text-[11px] text-[#999] dark:text-[#aaa] -mt-1">{t("llm_lang_desc")}</p>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const isActive = language === lang.value;
                return (
                  <button
                    key={lang.value}
                    type="button"
                    onClick={() => setLanguage(lang.value)}
                    className={`relative rounded-lg border p-3 text-left transition-all duration-200 ${
                      isActive
                        ? "border-[#1a1a1a] bg-[#1a1a1a] dark:border-white dark:bg-white text-white dark:text-black"
                        : "border-[#EBEBEB] dark:border-[#333] hover:border-[#ccc] dark:hover:border-[#555] bg-white dark:bg-[#111] text-[#111] dark:text-white"
                    }`}
                  >
                    <span className="text-xl mb-1.5 block">{lang.flag}</span>
                    <p className="text-[11px] font-medium">{lang.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/80 dark:text-black/70" : "text-[#999] dark:text-[#888]"}`}>{lang.native}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className={`h-3 w-3 ${isActive ? "text-white dark:text-[#111]" : ""}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Filters */}
          <div className="space-y-3 border-t border-[#F5F5F5] dark:border-[#333] pt-5">
            <Label className="text-[12px] font-medium text-[#666] dark:text-[#888]">{t("search_filters")}</Label>
            <p className="text-[11px] text-[#999] dark:text-[#aaa] -mt-1">{t("search_filters_desc")}</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa] flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> {t("job_title")}
                </Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Engineer"
                  className="rounded-lg h-9 bg-[#FAFAFA] dark:bg-[#111] border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white text-[13px] px-3 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa] flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> {t("location")}
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Paris, Remote"
                  className="rounded-lg h-9 bg-[#FAFAFA] dark:bg-[#111] border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white text-[13px] px-3 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa] flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> {t("contract_type")}
                </Label>
                <Input
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  placeholder="e.g. full-time"
                  className="rounded-lg h-9 bg-[#FAFAFA] dark:bg-[#111] border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white text-[13px] px-3 dark:text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa] flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5" /> {t("remote_preference")}
                </Label>
                <Input
                  value={remote}
                  onChange={(e) => setRemote(e.target.value)}
                  placeholder="e.g. remote, hybrid"
                  className="rounded-lg h-9 bg-[#FAFAFA] dark:bg-[#111] border-[#EBEBEB] dark:border-[#333] focus-visible:ring-[#1a1a1a] dark:focus-visible:ring-white text-[13px] px-3 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F5F5F5] dark:border-[#333]">
            <Button
              onClick={handleSaveAgentPreferences}
              disabled={saving}
              className="rounded-lg bg-[#1a1a1a] dark:bg-white text-white dark:text-black hover:bg-[#333] dark:hover:bg-[#e5e5e5] h-9 px-5 text-[13px] font-medium gap-2 shadow-sm"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

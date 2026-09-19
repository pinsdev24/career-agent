"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Globe, Save, Check, MapPin, Loader2, Handshake, MessageSquare, Megaphone, BookOpen, AlignLeft, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getProfile, updatePreferences } from "@/lib/api";
import { LanguagePreference } from "@/lib/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { setUserLocale } from "@/lib/i18n/locale";
import { useLocale } from "next-intl";
import { useFirstRun } from "@/components/first-run-provider";
import { MultiSelect } from "@/components/multi-select";
import {
  CONTRACT_TYPES,
  COUNTRIES,
  ROLE_SUGGESTIONS,
  WORK_MODES,
  countryLabel,
  searchCities,
} from "@/lib/geo-catalog";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const currentLocale = useLocale();
  const { setProfile: setFirstRunProfile } = useFirstRun();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Agent Settings
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState<LanguagePreference>("en");
  const [jobTitle, setJobTitle] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [workModes, setWorkModes] = useState<string[]>([]);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [legacyLocation, setLegacyLocation] = useState("");

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
          const prefs = prof.search_preferences;
          setJobTitle(prefs.job_title || "");
          setCountries((prefs.countries || []).map((c) => c.toUpperCase()));
          setCities(prefs.cities || []);
          setWorkModes(prefs.work_modes || (prefs.remote_preference ? [prefs.remote_preference] : []));
          setContractTypes(
            prefs.contract_types || (prefs.contract_type ? [prefs.contract_type] : [])
          );
          setPreferredRoles(prefs.preferred_roles || (prefs.job_title ? [prefs.job_title] : []));
          setLegacyLocation(prefs.location || "");
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
      const updated = await updatePreferences(
        tone as any,
        {
          job_title: jobTitle,
          countries,
          cities,
          work_modes: workModes,
          contract_types: contractTypes,
          preferred_roles: preferredRoles,
          remote_preference: workModes[0] || "",
          contract_type: contractTypes[0] || "",
          location: legacyLocation || undefined,
        },
        language
      );
      setFirstRunProfile(updated);
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

            <div className="space-y-4 mt-3">
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
                <Label className="text-[11px] text-[#999] dark:text-[#aaa]">{t("countries_label")}</Label>
                <MultiSelect
                  values={countries}
                  onChange={setCountries}
                  options={COUNTRIES.map((c) => ({
                    value: c.code,
                    label: countryLabel(c.code, currentLocale),
                  }))}
                  placeholder={t("countries_placeholder")}
                  hint={t("countries_hint")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa]">{t("cities_label")}</Label>
                <MultiSelect
                  values={cities}
                  onChange={setCities}
                  options={searchCities("", countries).map((city) => ({
                    value: city,
                    label: city,
                  }))}
                  placeholder={t("cities_placeholder")}
                  disabled={!countries.length}
                  allowCustom
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa]">{t("work_mode_label")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {WORK_MODES.map((mode) => {
                    const active = workModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setWorkModes((current) =>
                            current.includes(mode)
                              ? current.filter((item) => item !== mode)
                              : [...current, mode]
                          )
                        }
                        className={`rounded-lg border px-2 py-2.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-[#EBEBEB] bg-white text-[#1a1a1a] hover:border-[#ccc] dark:border-[#333] dark:bg-[#111] dark:text-white"
                        }`}
                      >
                        {t(`work_mode_${mode}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa]">{t("contract_label")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CONTRACT_TYPES.map((type) => {
                    const active = contractTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setContractTypes((current) =>
                            current.includes(type)
                              ? current.filter((item) => item !== type)
                              : [...current, type]
                          )
                        }
                        className={`rounded-lg border px-2 py-2.5 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                            : "border-[#EBEBEB] bg-white text-[#1a1a1a] hover:border-[#ccc] dark:border-[#333] dark:bg-[#111] dark:text-white"
                        }`}
                      >
                        {t(`contract_${type}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#999] dark:text-[#aaa]">{t("roles_label")}</Label>
                <MultiSelect
                  values={preferredRoles}
                  onChange={setPreferredRoles}
                  options={ROLE_SUGGESTIONS.map((role) => ({
                    value: role,
                    label: role,
                  }))}
                  placeholder={t("roles_placeholder")}
                  hint={t("roles_hint")}
                  allowCustom
                />
              </div>
              {legacyLocation ? (
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#999] dark:text-[#aaa] flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" /> {t("location_legacy_label")}
                  </Label>
                  <Input
                    value={legacyLocation}
                    onChange={(e) => setLegacyLocation(e.target.value)}
                    className="rounded-lg h-9 bg-[#FAFAFA] dark:bg-[#111] border-[#EBEBEB] dark:border-[#333] text-[13px] px-3 dark:text-white"
                  />
                  <p className="text-[11px] text-[#999]">{t("location_legacy_hint")}</p>
                </div>
              ) : null}
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

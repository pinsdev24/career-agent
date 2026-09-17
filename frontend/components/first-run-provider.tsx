"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { getProfile } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import {
  isProfileReady,
  readFirstRunSkipped,
  writeFirstRunSkipped,
} from "@/lib/profile-ready";
import { Button } from "@/components/ui/button";
import { FirstRunWizard } from "@/components/first-run-wizard";

const GATED_PATHS = new Set(["/dashboard", "/jobs"]);

type FirstRunContextValue = {
  profile: Profile | null;
  ready: boolean;
  loading: boolean;
  wizardOpen: boolean;
  openWizard: () => void;
  skipWizard: () => void;
  refreshProfile: () => Promise<Profile | null>;
  setProfile: (profile: Profile | null) => void;
};

const FirstRunContext = createContext<FirstRunContextValue | null>(null);

export function useFirstRun(): FirstRunContextValue {
  const ctx = useContext(FirstRunContext);
  if (!ctx) {
    throw new Error("useFirstRun must be used within FirstRunProvider");
  }
  return ctx;
}

export function FirstRunProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations("FirstRun");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const ready = isProfileReady(profile);

  const refreshProfile = useCallback(async () => {
    try {
      const next = await getProfile();
      setProfile(next);
      return next;
    } catch {
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const id = session?.user?.id ?? null;
        if (cancelled) return;
        setUserId(id);
        if (id) setSkipped(readFirstRunSkipped(id));
        await refreshProfile();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  useEffect(() => {
    if (loading || ready || skipped) return;
    if (GATED_PATHS.has(pathname)) setWizardOpen(true);
  }, [loading, pathname, ready, skipped]);

  useEffect(() => {
    if (ready && userId) {
      writeFirstRunSkipped(userId, false);
      setSkipped(false);
    }
  }, [ready, userId]);

  const openWizard = useCallback(() => setWizardOpen(true), []);

  const skipWizard = useCallback(() => {
    if (userId) writeFirstRunSkipped(userId, true);
    setSkipped(true);
    setWizardOpen(false);
  }, [userId]);

  const handleWizardOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setWizardOpen(true);
        return;
      }
      if (!isProfileReady(profile) && !skipped) {
        skipWizard();
        return;
      }
      setWizardOpen(false);
    },
    [profile, skipWizard, skipped]
  );

  const value = useMemo<FirstRunContextValue>(
    () => ({
      profile,
      ready,
      loading,
      wizardOpen,
      openWizard,
      skipWizard,
      refreshProfile,
      setProfile,
    }),
    [loading, openWizard, profile, ready, refreshProfile, skipWizard, wizardOpen]
  );

  const showBanner = !loading && !ready && !wizardOpen;

  return (
    <FirstRunContext.Provider value={value}>
      {showBanner && (
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-[#EBEBEB] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#333] dark:bg-[#111]">
          <div className="flex min-w-0 items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#1a1a1a] dark:text-white" />
            <p className="text-[13px] leading-relaxed text-[#444] dark:text-[#ccc]">
              {t("banner_title")}
            </p>
          </div>
          <Button
            type="button"
            onClick={openWizard}
            className="h-9 shrink-0 rounded-lg px-3.5 text-[13px]"
          >
            {t("banner_cta")}
          </Button>
        </div>
      )}
      {children}
      <FirstRunWizard
        open={wizardOpen}
        onOpenChange={handleWizardOpenChange}
        profile={profile}
        onProfileUpdated={setProfile}
        onSkip={skipWizard}
        onFinished={() => setWizardOpen(false)}
      />
    </FirstRunContext.Provider>
  );
}

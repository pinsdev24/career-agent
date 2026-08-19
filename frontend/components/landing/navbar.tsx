"use client";

import Link from "next/link";
import React from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";

const NAV_LINKS = [
  { href: "#features", key: "features" },
  { href: "#how-it-works", key: "how_it_works" },
  { href: "#control", key: "control" },
  { href: "#faq", key: "faq" },
] as const;

export function LandingNavbar() {
  const t = useTranslations("Landing");
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="fixed top-4 right-4 left-4 z-50 transition-all duration-500">
      <nav className="mx-auto max-w-[1200px] rounded-2xl border border-foreground/10 bg-background/80 shadow-lg backdrop-blur-xl">
        <div className={`flex items-center justify-between px-6 transition-all duration-500 lg:px-8 ${scrolled ? "h-12" : "h-14"}`}>
          <Link href="#top" className="flex items-center" onClick={() => setMobileOpen(false)}>
            <span className="font-display text-xl tracking-tight">Ariadne</span>
          </Link>

          <div className="hidden items-center gap-12 md:flex">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative text-sm text-foreground/70 transition-colors duration-300 hover:text-foreground"
              >
                {t(`nav.${item.key}`)}
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login" className="text-xs text-foreground/70 transition-colors hover:text-foreground">
              {t("nav.sign_in")}
            </Link>
            <Link href="/login">
              <Button className="h-9 rounded-full bg-foreground px-5 text-xs text-background hover:bg-foreground/90">
                {t("nav.start")}
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-foreground/10 px-6 py-5 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-3 text-base text-foreground/80"
                >
                  {t(`nav.${item.key}`)}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                <Button className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90">
                  {t("nav.start")}
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" className="h-12 w-full rounded-full">
                  {t("nav.dashboard")}
                </Button>
              </Link>
            </div>
            <div className="mt-4 flex items-center justify-center gap-3">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MultiSelect } from "@/components/multi-select";
import { Button } from "@/components/ui/button";
import {
  CONTRACT_TYPES,
  COUNTRIES,
  ROLE_SUGGESTIONS,
  WORK_MODES,
  countryLabel,
} from "@/lib/geo-catalog";

export type JobsBarFilters = {
  countries: string[];
  workModes: string[];
  contractTypes: string[];
  roles: string[];
};

export function JobsFilterBar({
  value,
  onChange,
  onApply,
  onClear,
}: {
  value: JobsBarFilters;
  onChange: (next: JobsBarFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const t = useTranslations("Jobs");
  const tSettings = useTranslations("Settings");
  const locale = useLocale();
  const [more, setMore] = useState(false);

  const activeCount =
    Number(value.countries.length > 0) +
    Number(value.workModes.length > 0) +
    Number(value.contractTypes.length > 0) +
    Number(value.roles.length > 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-[#999]">
          {t("filters_label")}
        </span>
        {activeCount > 0 ? (
          <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] text-[#666] dark:bg-[#222] dark:text-[#aaa]">
            {t("filter_active_count", { count: activeCount })}
          </span>
        ) : null}
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <p className="text-[11px] text-[#888]">{t("filter_countries")}</p>
          <MultiSelect
          values={value.countries}
          onChange={(countries) => onChange({ ...value, countries })}
          options={COUNTRIES.map((c) => ({
            value: c.code,
            label: countryLabel(c.code, locale),
          }))}
          placeholder={t("filter_countries_placeholder")}
        />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-[#888]">{t("filter_work_mode")}</p>
        <div className="flex flex-wrap gap-1.5">
          {WORK_MODES.map((mode) => {
            const active = value.workModes.includes(mode);
            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    workModes: active
                      ? value.workModes.filter((item) => item !== mode)
                      : [...value.workModes, mode],
                  })
                }
                className={`rounded-lg border px-2.5 py-2 text-[12px] font-medium ${
                  active
                    ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                    : "border-[#EBEBEB] bg-white text-[#1a1a1a] dark:border-[#333] dark:bg-[#111] dark:text-white"
                }`}
              >
                {tSettings(`work_mode_${mode}`)}
              </button>
            );
          })}
        </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setMore((v) => !v)}
            className="h-9 rounded-lg px-3 text-[12px]"
          >
            {t("filter_more")}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            className="h-9 rounded-lg px-3 text-[12px]"
          >
            {t("filter_apply")}
          </Button>
        </div>
      </div>
      {more ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[11px] text-[#888]">{t("filter_contract")}</p>
            <div className="flex flex-wrap gap-1.5">
              {CONTRACT_TYPES.map((type) => {
                const active = value.contractTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...value,
                        contractTypes: active
                          ? value.contractTypes.filter((item) => item !== type)
                          : [...value.contractTypes, type],
                      })
                    }
                    className={`rounded-lg border px-2.5 py-2 text-[12px] font-medium ${
                      active
                        ? "border-[#1a1a1a] bg-[#1a1a1a] text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-[#EBEBEB] bg-white dark:border-[#333] dark:bg-[#111]"
                    }`}
                  >
                    {tSettings(`contract_${type}`)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-[#888]">{t("filter_roles")}</p>
            <MultiSelect
              values={value.roles}
              onChange={(roles) => onChange({ ...value, roles })}
              options={ROLE_SUGGESTIONS.map((role) => ({
                value: role,
                label: role,
              }))}
              placeholder={t("filter_roles_placeholder")}
              allowCustom
            />
          </div>
        </div>
      ) : null}
      {activeCount > 0 ? (
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-medium text-[#888] hover:text-[#1a1a1a] dark:hover:text-white"
        >
          {t("filter_clear")}
        </button>
      ) : null}
    </div>
  );
}

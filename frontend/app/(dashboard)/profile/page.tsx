"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getProfile, uploadCV, getMemories, updateMemory } from "@/lib/api";
import type { Profile, Memory } from "@/lib/types";
import {
  FileCheck,
  Brain,
  Upload,
  Loader2,
  CheckCircle2,
  Trash2,
  Briefcase,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Common");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);

      setLoadingMemories(true);
      const m = await getMemories();
      setMemories(m);
    } catch {
    } finally {
      setLoading(false);
      setLoadingMemories(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const p = await uploadCV(file);
      setProfile(p);
      setSuccess(t("cv_active"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      await updateMemory(key, {});
      setMemories(prev => prev.map(m => m.memory_key === key ? { ...m, memory_data: {}, updated_at: new Date().toISOString() } : m));
      setSuccess(t("clear"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear memory");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#999] dark:text-[#888]" />
        <span className="text-[13px] text-[#999] dark:text-[#888]">{tCommon("loading")}</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] dark:text-white tracking-tight">{t("title")}</h1>
        <p className="text-[13px] text-[#999] dark:text-[#888] mt-0.5">
          {t("subtitle")}
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600 animate-in slide-in-from-top-2 duration-300">
          <span className="shrink-0">⚠️</span>
          <span className="font-medium">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      {/* CV Upload */}
      <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] dark:border-[#222]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">{t("cv_section")}</h2>
          <p className="text-[12px] text-[#999] dark:text-[#888] mt-0.5">{t("cv_description")}</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer group">
              <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#ddd] dark:border-[#444] px-5 py-3 transition-all hover:border-[#1a1a1a] dark:hover:border-white hover:bg-[#FAFAFA] dark:bg-[#111] dark:hover:bg-[#111]">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1a1a1a] dark:text-white" />
                ) : (
                  <Upload className="h-4 w-4 text-[#999] group-hover:text-[#1a1a1a] dark:text-white dark:group-hover:text-white transition-colors" />
                )}
                <span className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">
                  {uploading ? t("uploading") : t("upload_btn")}
                </span>
              </div>
            </label>

            {profile?.cv_raw_text && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                <FileCheck className="h-3.5 w-3.5" />
                <span className="text-[12px] font-medium">{t("cv_active")}</span>
              </div>
            )}
          </div>

          {/* Extracted data preview */}
          {profile?.cv_structured && Object.keys(profile.cv_structured).length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#F5F5F5] dark:border-[#222] space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[#999] dark:text-[#aaa]" />
                <span className="text-[12px] font-semibold text-[#666] dark:text-[#888]">{t("extracted_data")}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identity */}
                <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-[#999] dark:text-[#aaa] uppercase tracking-wider">{t("identity")}</span>
                  <p className="text-[14px] font-medium text-[#1a1a1a] dark:text-white">
                    {typeof profile.cv_structured.full_name === "string" ? profile.cv_structured.full_name : "—"}
                  </p>
                  {typeof profile.cv_structured.email === "string" && (
                    <p className="text-[12px] text-[#999] dark:text-[#888]">{profile.cv_structured.email}</p>
                  )}
                  {typeof profile.cv_structured.location === "string" && (
                    <p className="text-[12px] text-[#999] dark:text-[#888]">{profile.cv_structured.location}</p>
                  )}
                </div>

                {/* Skills */}
                <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#999] dark:text-[#aaa] uppercase tracking-wider">{t("skills")}</span>
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.length > 8 && (
                      <Dialog>
                        <DialogTrigger className="text-[10px] font-medium text-[#1a1a1a] dark:text-white hover:underline cursor-pointer">{t("view_all")}</DialogTrigger>
                        <DialogContent className="max-w-md rounded-xl max-h-[80vh] overflow-y-auto bg-white dark:bg-[#111]">
                          <DialogHeader>
                            <DialogTitle className="text-[15px]">{t("all_skills")}</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {profile.cv_structured.skills.map((skill: string) => (
                              <span key={skill} className="px-2 py-1 rounded-md bg-[#F5F5F5] dark:bg-[#222] border border-[#EBEBEB] dark:border-[#333] text-[12px] font-medium text-[#1a1a1a] dark:text-white">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.slice(0, 8).map((skill: string) => (
                      <span key={skill} className="px-2 py-0.5 rounded-md bg-white dark:bg-black border border-[#EBEBEB] dark:border-[#333] text-[10px] font-medium text-[#1a1a1a] dark:text-white">
                        {skill}
                      </span>
                    ))}
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.length > 8 && (
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#111] border border-[#EBEBEB] dark:border-[#333] text-[10px] text-[#999] dark:text-[#888]">
                        +{profile.cv_structured.skills.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience */}
              {Array.isArray(profile.cv_structured.experience) && profile.cv_structured.experience.length > 0 && (
                <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" /> {t("experience")}
                    </span>
                    {profile.cv_structured.experience.length > 3 && (
                      <Dialog>
                        <DialogTrigger className="text-[10px] font-medium text-[#1a1a1a] dark:text-white hover:underline cursor-pointer">{t("view_details")}</DialogTrigger>
                        <DialogContent className="max-w-lg rounded-xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[15px]">{t("full_experience")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            {profile.cv_structured.experience.map((exp: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 pl-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] dark:bg-[#111] mt-1.5 shrink-0" />
                                <div>
                                  <p className="text-[14px] font-medium text-[#1a1a1a] dark:text-white">{exp.title}</p>
                                  <div className="flex items-center gap-1.5 text-[13px] text-[#666] dark:text-[#aaa]">
                                    <span>{exp.company}</span>
                                    {exp.duration && (
                                      <>
                                        <span className="text-[#ddd]">·</span>
                                        <span className="font-mono text-[12px]">{exp.duration}</span>
                                      </>
                                    )}
                                  </div>
                                  {exp.description && (
                                    <p className="text-[12px] text-[#999] dark:text-[#888] mt-1.5 leading-relaxed">{exp.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  <div className="space-y-3">
                    {profile.cv_structured.experience.map((exp: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 pl-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] dark:bg-[#111] mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-[#1a1a1a] dark:text-white">{exp.title}</p>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#999] dark:text-[#888]">
                            <span>{exp.company}</span>
                            {exp.duration && (
                              <>
                                <span className="text-[#ddd]">·</span>
                                <span className="font-mono text-[11px]">{exp.duration}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {Array.isArray(profile.cv_structured.education) && profile.cv_structured.education.length > 0 && (
                <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-4 space-y-3">
                  <span className="text-[10px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> {t("education")}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profile.cv_structured.education.map((edu: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-white dark:bg-[#111] border border-[#EBEBEB] dark:border-[#333]">
                        <p className="text-[12px] font-medium text-[#1a1a1a] dark:text-white">{edu.degree}</p>
                        <p className="text-[11px] text-[#999] dark:text-[#888]">{edu.institution}</p>
                        {edu.year && <p className="text-[10px] font-mono text-[#ccc] mt-1">{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {Array.isArray(profile.cv_structured.languages) && profile.cv_structured.languages.length > 0 && (
                <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-4 space-y-2">
                  <span className="text-[10px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider">{t("languages")}</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.cv_structured.languages.map((lang: any, i: number) => (
                      <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#111] border border-[#EBEBEB] dark:border-[#333] text-[11px]">
                        <span className="font-medium text-[#1a1a1a] dark:text-white">{lang.language}</span>
                        <span className="text-[#999] dark:text-[#888]">{lang.level || "Native"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Agent Memory */}
      <div className="rounded-xl border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] dark:border-[#222] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#1a1a1a] dark:text-white">{t("agent_memory")}</h2>
            <p className="text-[12px] text-[#999] dark:text-[#888] mt-0.5">{t("memories_desc")}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-700">{t("memory_active")}</span>
          </div>
        </div>

        <div className="p-5">
          {loadingMemories ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#999] dark:text-[#888]" />
              <span className="text-[12px] text-[#999] dark:text-[#888]">{t("loading_memories")}</span>
            </div>
          ) : (() => {
            const prefMemory = memories.find(m => m.memory_key === 'preferences');
            const data = prefMemory?.memory_data || {};
            const hasData = Object.keys(data).length > 0;

            if (!hasData) {
              return (
                <div className="py-10 text-center">
                  <Brain className="h-8 w-8 text-[#ddd] mx-auto mb-3" />
                  <h4 className="text-[13px] font-medium text-[#1a1a1a] dark:text-white mb-1">{t("no_memories")}</h4>
                  <p className="text-[12px] text-[#999] dark:text-[#888] max-w-sm mx-auto leading-relaxed">
                    {t("no_memories_desc")}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Style notes */}
                {data.style_notes && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> {t("style_notes")}
                    </label>
                    <p className="text-[13px] text-[#1a1a1a] dark:text-white bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] rounded-lg p-3 leading-relaxed">
                      {data.style_notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-3 space-y-1">
                    <label className="text-[10px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider">{t("tone")}</label>
                    <p className="text-[12px] font-medium text-[#1a1a1a] dark:text-white">{data.preferred_tone || "Adaptive"}</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] dark:bg-[#111] border border-[#F5F5F5] dark:border-[#222] p-3 space-y-1">
                    <label className="text-[10px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider">{t("length")}</label>
                    <p className="text-[12px] font-medium text-[#1a1a1a] dark:text-white">{data.letter_length_preference || "Optimal"}</p>
                  </div>
                </div>

                {/* Industries */}
                {(data.preferred_industries as string[] || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider">{t("industries")}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.preferred_industries as string[]).map((ind, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#F5F5F5] dark:bg-[#222] border border-[#EBEBEB] dark:border-[#333] text-[11px] font-medium text-[#1a1a1a] dark:text-white">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roles */}
                {(data.preferred_role_types as string[] || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] dark:text-[#888] uppercase tracking-wider">{t("roles")}</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.preferred_role_types as string[]).map((role, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#1a1a1a] dark:bg-[#111] text-[11px] font-medium text-white">
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="bg-[#FAFAFA] dark:bg-[#111] border-t border-[#F5F5F5] dark:border-[#222] px-5 py-3 flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#ccc]">
            {memories.find(m => m.memory_key === 'preferences')?.updated_at
              ? `${t("last_sync")}: ${new Date(memories.find(m => m.memory_key === 'preferences')!.updated_at!).toLocaleDateString()}`
              : t("no_data")}
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              className="h-7 px-3 rounded-md border border-[#EBEBEB] dark:border-[#333] bg-white dark:bg-[#111] text-[11px] font-medium text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" /> {t("clear")}
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px]">{t("clear_memory_title")}</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px]">
                  {t("clear_memory_desc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-9 text-[13px] rounded-lg">{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteMemory('preferences')}
                  className="h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px]"
                >
                  {t("clear_btn")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );

}

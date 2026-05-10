"use client";

import { useCallback, useEffect, useState } from "react";
import { getProfile, uploadCV, updatePreferences, getMemories, updateMemory } from "@/lib/api";
import type { Profile, ToneOfVoice, Memory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  Save,
  Briefcase,
  MapPin,
  FileCheck,
  Wifi,
  MessageSquare,
  Megaphone,
  BookOpen,
  Handshake,
  AlignLeft,
  Brain,
  Trash2,
  Check,
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

const TONES: { value: ToneOfVoice; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "professional", label: "Professional", desc: "Polished & corporate", icon: Handshake },
  { value: "conversational", label: "Conversational", desc: "Friendly & natural", icon: MessageSquare },
  { value: "enthusiastic", label: "Enthusiastic", desc: "Energetic & passionate", icon: Megaphone },
  { value: "formal", label: "Formal", desc: "Traditional & respectful", icon: BookOpen },
  { value: "concise", label: "Concise", desc: "Brief & to-the-point", icon: AlignLeft },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [tone, setTone] = useState<ToneOfVoice>("professional");
  const [location, setLocation] = useState("");
  const [contractType, setContractType] = useState("");
  const [remote, setRemote] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setTone(p.tone_of_voice || "professional");
      setLocation(p.search_preferences?.location || "");
      setContractType(p.search_preferences?.contract_type || "");
      setRemote(p.search_preferences?.remote_preference || "");
      setJobTitle(p.search_preferences?.job_title || "");

      // Fetch memories
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
      setSuccess("CV processed successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const p = await updatePreferences(tone, {
        location: location || null,
        contract_type: contractType || null,
        remote_preference: remote || null,
        job_title: jobTitle || null,
      });
      setProfile(p);
      setSuccess("Preferences saved.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    try {
      await updateMemory(key, {});
      setMemories(prev => prev.map(m => m.memory_key === key ? { ...m, memory_data: {}, updated_at: new Date().toISOString() } : m));
      setSuccess("Memory cleared.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear memory");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
        <span className="text-[13px] text-[#999]">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1a1a1a] tracking-tight">Profile</h1>
        <p className="text-[13px] text-[#999] mt-0.5">
          Manage your CV, preferences, and agent settings.
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
      <div className="rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">CV / Resume</h2>
          <p className="text-[12px] text-[#999] mt-0.5">Upload your CV in PDF format for agent analysis.</p>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer group">
              <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#ddd] px-5 py-3 transition-all hover:border-[#1a1a1a] hover:bg-[#FAFAFA]">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#1a1a1a]" />
                ) : (
                  <Upload className="h-4 w-4 text-[#999] group-hover:text-[#1a1a1a] transition-colors" />
                )}
                <span className="text-[13px] font-medium text-[#1a1a1a]">
                  {uploading ? "Processing..." : "Upload PDF"}
                </span>
              </div>
            </label>

            {profile?.cv_raw_text && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
                <FileCheck className="h-3.5 w-3.5" />
                <span className="text-[12px] font-medium">CV Active</span>
              </div>
            )}
          </div>

          {/* Extracted data preview */}
          {profile?.cv_structured && Object.keys(profile.cv_structured).length > 0 && (
            <div className="mt-5 pt-5 border-t border-[#F5F5F5] space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2">
                <Brain className="h-3.5 w-3.5 text-[#999]" />
                <span className="text-[12px] font-semibold text-[#666]">Extracted Data</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Identity */}
                <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-4 space-y-1">
                  <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Identity</span>
                  <p className="text-[14px] font-medium text-[#1a1a1a]">
                    {typeof profile.cv_structured.full_name === "string" ? profile.cv_structured.full_name : "—"}
                  </p>
                  {typeof profile.cv_structured.email === "string" && (
                    <p className="text-[12px] text-[#999]">{profile.cv_structured.email}</p>
                  )}
                  {typeof profile.cv_structured.location === "string" && (
                    <p className="text-[12px] text-[#999]">{profile.cv_structured.location}</p>
                  )}
                </div>

                {/* Skills */}
                <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Skills</span>
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.length > 8 && (
                      <Dialog>
                        <DialogTrigger className="text-[10px] font-medium text-[#1a1a1a] hover:underline cursor-pointer">View All</DialogTrigger>
                        <DialogContent className="max-w-md rounded-xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[15px]">All Skills</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {profile.cv_structured.skills.map((skill: string) => (
                              <span key={skill} className="px-2 py-1 rounded-md bg-[#F5F5F5] border border-[#EBEBEB] text-[12px] font-medium text-[#1a1a1a]">
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
                      <span key={skill} className="px-2 py-0.5 rounded-md bg-white border border-[#EBEBEB] text-[10px] font-medium text-[#1a1a1a]">
                        {skill}
                      </span>
                    ))}
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.length > 8 && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-[#EBEBEB] text-[10px] text-[#999]">
                        +{profile.cv_structured.skills.length - 8}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Experience */}
              {Array.isArray(profile.cv_structured.experience) && profile.cv_structured.experience.length > 0 && (
                <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" /> Experience
                    </span>
                    {profile.cv_structured.experience.length > 3 && (
                      <Dialog>
                        <DialogTrigger className="text-[10px] font-medium text-[#1a1a1a] hover:underline cursor-pointer">View details</DialogTrigger>
                        <DialogContent className="max-w-lg rounded-xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="text-[15px]">Full Experience</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-2">
                            {profile.cv_structured.experience.map((exp: any, i: number) => (
                              <div key={i} className="flex items-start gap-3 pl-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] mt-1.5 shrink-0" />
                                <div>
                                  <p className="text-[14px] font-medium text-[#1a1a1a]">{exp.title}</p>
                                  <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
                                    <span>{exp.company}</span>
                                    {exp.duration && (
                                      <>
                                        <span className="text-[#ddd]">·</span>
                                        <span className="font-mono text-[12px]">{exp.duration}</span>
                                      </>
                                    )}
                                  </div>
                                  {exp.description && (
                                    <p className="text-[12px] text-[#999] mt-1.5 leading-relaxed">{exp.description}</p>
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
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1a1a1a] mt-1.5 shrink-0" />
                        <div>
                          <p className="text-[13px] font-medium text-[#1a1a1a]">{exp.title}</p>
                          <div className="flex items-center gap-1.5 text-[12px] text-[#999]">
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
                <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-4 space-y-3">
                  <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-3 w-3" /> Education
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profile.cv_structured.education.map((edu: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-white border border-[#EBEBEB]">
                        <p className="text-[12px] font-medium text-[#1a1a1a]">{edu.degree}</p>
                        <p className="text-[11px] text-[#999]">{edu.institution}</p>
                        {edu.year && <p className="text-[10px] font-mono text-[#ccc] mt-1">{edu.year}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {Array.isArray(profile.cv_structured.languages) && profile.cv_structured.languages.length > 0 && (
                <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-4 space-y-2">
                  <span className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Languages</span>
                  <div className="flex flex-wrap gap-2">
                    {profile.cv_structured.languages.map((lang: any, i: number) => (
                      <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#EBEBEB] text-[11px]">
                        <span className="font-medium text-[#1a1a1a]">{lang.language}</span>
                        <span className="text-[#999]">{lang.level || "Native"}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5]">
          <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Preferences</h2>
          <p className="text-[12px] text-[#999] mt-0.5">Configure how the agent writes and searches.</p>
        </div>

        <div className="p-5 space-y-6">
          {/* Tone */}
          <div className="space-y-3">
            <Label className="text-[12px] font-medium text-[#666]">Tone of Voice</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {TONES.map((t) => {
                const Icon = t.icon;
                const isActive = tone === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`relative rounded-lg border p-3 text-left transition-all duration-200 ${isActive
                        ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                        : "border-[#EBEBEB] hover:border-[#ccc] bg-white"
                      }`}
                  >
                    <Icon className={`h-4 w-4 mb-2 ${isActive ? "text-white" : "text-[#ccc]"}`} />
                    <p className="text-[11px] font-medium">{t.label}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive ? "text-white/60" : "text-[#999]"}`}>{t.desc}</p>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search params */}
          <div className="space-y-3">
            <Label className="text-[12px] font-medium text-[#666]">Search Filters</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle" className="text-[11px] text-[#999] flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Product Engineer"
                  className="rounded-lg h-9 bg-[#FAFAFA] border-[#EBEBEB] focus-visible:ring-[#1a1a1a] text-[13px] px-3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-[11px] text-[#999] flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Paris, Remote"
                  className="rounded-lg h-9 bg-[#FAFAFA] border-[#EBEBEB] focus-visible:ring-[#1a1a1a] text-[13px] px-3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contractType" className="text-[11px] text-[#999] flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Contract Type
                </Label>
                <Input
                  id="contractType"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  placeholder="e.g. full-time"
                  className="rounded-lg h-9 bg-[#FAFAFA] border-[#EBEBEB] focus-visible:ring-[#1a1a1a] text-[13px] px-3"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="remote" className="text-[11px] text-[#999] flex items-center gap-1.5">
                  <Wifi className="h-3 w-3" />
                  Remote Preference
                </Label>
                <Input
                  id="remote"
                  value={remote}
                  onChange={(e) => setRemote(e.target.value)}
                  placeholder="e.g. remote, hybrid"
                  className="rounded-lg h-9 bg-[#FAFAFA] border-[#EBEBEB] focus-visible:ring-[#1a1a1a] text-[13px] px-3"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#F5F5F5]">
            <Button
              onClick={handleSavePreferences}
              disabled={saving}
              className="rounded-lg bg-[#1a1a1a] text-white hover:bg-[#333] h-9 px-5 text-[13px] font-medium gap-2 shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </div>

      {/* Agent Memory */}
      <div className="rounded-xl border border-[#EBEBEB] bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F5F5F5] flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-[#1a1a1a]">Agent Memory</h2>
            <p className="text-[12px] text-[#999] mt-0.5">Persistent learning from your feedback.</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-md border border-emerald-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-700">Active</span>
          </div>
        </div>

        <div className="p-5">
          {loadingMemories ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#999]" />
              <span className="text-[12px] text-[#999]">Loading memories...</span>
            </div>
          ) : (() => {
            const prefMemory = memories.find(m => m.memory_key === 'preferences');
            const data = prefMemory?.memory_data || {};
            const hasData = Object.keys(data).length > 0;

            if (!hasData) {
              return (
                <div className="py-10 text-center">
                  <Brain className="h-8 w-8 text-[#ddd] mx-auto mb-3" />
                  <h4 className="text-[13px] font-medium text-[#1a1a1a] mb-1">No Memories Yet</h4>
                  <p className="text-[12px] text-[#999] max-w-sm mx-auto leading-relaxed">
                    Ariadne learns from your feedback. As you review cover letters, it builds a persistent profile here.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Style notes */}
                {data.style_notes && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" /> Style Notes
                    </label>
                    <p className="text-[13px] text-[#1a1a1a] bg-[#FAFAFA] border border-[#F5F5F5] rounded-lg p-3 leading-relaxed">
                      {data.style_notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-3 space-y-1">
                    <label className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Tone</label>
                    <p className="text-[12px] font-medium text-[#1a1a1a]">{data.preferred_tone || "Adaptive"}</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] border border-[#F5F5F5] p-3 space-y-1">
                    <label className="text-[10px] font-semibold text-[#999] uppercase tracking-wider">Length</label>
                    <p className="text-[12px] font-medium text-[#1a1a1a]">{data.letter_length_preference || "Optimal"}</p>
                  </div>
                </div>

                {/* Industries */}
                {(data.preferred_industries as string[] || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">Industries</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.preferred_industries as string[]).map((ind, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#F5F5F5] border border-[#EBEBEB] text-[11px] font-medium text-[#1a1a1a]">
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roles */}
                {(data.preferred_role_types as string[] || []).length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">Roles</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(data.preferred_role_types as string[]).map((role, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-md bg-[#1a1a1a] text-[11px] font-medium text-white">
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
        <div className="bg-[#FAFAFA] border-t border-[#F5F5F5] px-5 py-3 flex justify-between items-center">
          <span className="text-[10px] font-mono text-[#ccc]">
            {memories.find(m => m.memory_key === 'preferences')?.updated_at
              ? `Last sync: ${new Date(memories.find(m => m.memory_key === 'preferences')!.updated_at!).toLocaleDateString()}`
              : 'No data'}
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              className="h-7 px-3 rounded-md border border-[#EBEBEB] bg-white text-[11px] font-medium text-red-500 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="h-3 w-3" /> Clear
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm rounded-xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[15px]">Clear Agent Memory?</AlertDialogTitle>
                <AlertDialogDescription className="text-[13px]">
                  This will delete all learned preferences. The agent will need to relearn from your future interactions.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-9 text-[13px] rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDeleteMemory('preferences')}
                  className="h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[13px]"
                >
                  Clear Memory
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { getProfile, uploadCV, updatePreferences, getMemories, updateMemory } from "@/lib/api";
import type { Profile, ToneOfVoice, Memory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  Settings,
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
  Database,
  History,
  Sparkles,
  RefreshCcw,
  Trash2,
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
      setSuccess("CV processed. Data extracted successfully.");
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
      setSuccess("Profile synchronization complete.");
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
      setSuccess(`Memory node '${key}' has been purged.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear memory");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#111111]" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading profile data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-12 border-b border-[#E8E6E1]">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-1 border-t-2 border-[#111111]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Personnel Core</span>
          </div>
          <h1 className="text-6xl font-medium tracking-tighter text-[#111111]">
            Career <span className="text-gray-300 font-light italic">Identity</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl font-light">
            Manage your autonomous persona, upload professional assets, and configure agent yield strategies.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className="max-w-2xl mx-auto animate-in slide-in-from-top-4 duration-500">
          {error && (
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-red-100 bg-red-50 p-6 text-[11px] font-bold uppercase tracking-widest text-red-600 shadow-sm">
              <span className="shrink-0 text-lg">⚠️</span>
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-6 text-[11px] font-bold uppercase tracking-widest text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: ASSETS */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-px bg-[#E8E6E1] flex-1" />
          <h2 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] whitespace-nowrap">Asset Management</h2>
          <div className="h-px bg-[#E8E6E1] flex-1" />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-[#E8E6E1] p-12 shadow-sm relative overflow-hidden group">
          <div
            className="absolute inset-0 pointer-events-none z-0 opacity-[0.02] group-hover:opacity-[0.04] transition-opacity duration-1000"
            style={{
              backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`,
              backgroundSize: "3rem 3rem"
            }}
          />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F3F0] border border-[#E8E6E1] mb-6">
                  <FileText className="h-6 w-6 text-[#111111]" />
                </div>
                <h3 className="text-3xl font-medium text-[#111111] tracking-tight">Professional Vitae</h3>
                <p className="text-gray-400 font-light text-base leading-relaxed">
                  Upload your CV in PDF format. Our extractors will parse your professional narrative to feed the agent graph.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6">
                <label className="cursor-pointer group/upload">
                  <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
                  <div className="flex items-center gap-6 rounded-full border-2 border-dashed border-[#E8E6E1] px-10 h-20 transition-all duration-300 hover:border-[#111111] group-hover:bg-[#FDFDFC]">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-[#111111]" />
                    ) : (
                      <Upload className="h-6 w-6 text-gray-300 group-hover/upload:text-[#111111] transition-colors" />
                    )}
                    <div className="text-left">
                      <p className="font-bold text-[11px] uppercase tracking-widest text-[#111111]">
                        {uploading ? "Analyzing..." : "Upload Vitae"}
                      </p>
                      {!uploading && <p className="text-[10px] text-gray-400 font-light uppercase tracking-widest mt-1">PDF Format only</p>}
                    </div>
                  </div>
                </label>

                {profile?.cv_raw_text && (
                  <div className="flex items-center gap-3 px-6 h-12 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">
                    <FileCheck className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Asset Active</span>
                  </div>
                )}
              </div>
            </div>

            {profile?.cv_structured && Object.keys(profile.cv_structured).length > 0 && (
              <div className="bg-[#F4F3F0]/50 rounded-[2rem] border border-[#E8E6E1] p-10 space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Extracted Identity</span>
                  <p className="text-2xl font-medium text-[#111111] tracking-tighter">
                    {typeof profile.cv_structured.full_name === "string" ? profile.cv_structured.full_name : "Anonymous Candidate"}
                  </p>
                </div>

                <div className="space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Identified Competencies</span>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(profile.cv_structured.skills) && profile.cv_structured.skills.map((skill: string) => (
                      <span key={skill} className="px-4 py-1.5 rounded-full bg-white border border-[#E8E6E1] text-[11px] font-bold text-[#111111] uppercase tracking-wider shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PREFERENCES */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-px bg-[#E8E6E1] flex-1" />
          <h2 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] whitespace-nowrap">Agent Configuration</h2>
          <div className="h-px bg-[#E8E6E1] flex-1" />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-[#E8E6E1] p-12 shadow-sm space-y-16">
          {/* Tone selector */}
          <div className="space-y-8">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#111111]">Linguistic Profile</h3>
              <p className="text-gray-400 text-sm font-light">Define the persona used for autonomous asset generation.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {TONES.map((t) => {
                const Icon = t.icon;
                const isActive = tone === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`group relative rounded-[1.5rem] border p-6 text-left transition-all duration-500 overflow-hidden ${isActive
                      ? "border-[#111111] bg-[#111111] text-white shadow-xl translate-y-[-4px]"
                      : "border-[#E8E6E1] hover:border-[#111111]/30 hover:bg-[#FDFDFC]"
                      }`}
                  >
                    <Icon className={`h-6 w-6 mb-8 transition-transform duration-500 group-hover:scale-110 ${isActive ? "text-white" : "text-gray-300"}`} />
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1">{t.label}</p>
                    <p className={`text-[10px] font-light leading-tight transition-colors ${isActive ? "text-gray-400" : "text-gray-400"}`}>{t.desc}</p>

                    {isActive && (
                      <div className="absolute top-4 right-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job search criteria */}
          <div className="space-y-8">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#111111]">Market Filters</h3>
              <p className="text-gray-400 text-sm font-light">Strategic parameters for automated market discovery nodes.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-3">
                <Label htmlFor="jobTitle" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                  <Briefcase className="h-4 w-4" />
                  Target Architecture
                </Label>
                <Input
                  id="jobTitle"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Lead Product Engineer"
                  className="rounded-[1rem] h-14 bg-[#F4F3F0]/30 border-[#E8E6E1] focus-visible:ring-[#111111] font-medium text-[#111111] px-6 text-lg placeholder:text-gray-200"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="location" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                  <MapPin className="h-4 w-4" />
                  Territory Focus
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. EMEA, remote"
                  className="rounded-[1rem] h-14 bg-[#F4F3F0]/30 border-[#E8E6E1] focus-visible:ring-[#111111] font-medium text-[#111111] px-6 text-lg placeholder:text-gray-200"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="contractType" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                  <FileText className="h-4 w-4" />
                  Engagement Model
                </Label>
                <Input
                  id="contractType"
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  placeholder="e.g. full-time"
                  className="rounded-[1rem] h-14 bg-[#F4F3F0]/30 border-[#E8E6E1] focus-visible:ring-[#111111] font-medium text-[#111111] px-6 text-lg placeholder:text-gray-200"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="remote" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-3">
                  <Wifi className="h-4 w-4" />
                  Spatial Modality
                </Label>
                <Input
                  id="remote"
                  value={remote}
                  onChange={(e) => setRemote(e.target.value)}
                  placeholder="e.g. high remote yield"
                  className="rounded-[1rem] h-14 bg-[#F4F3F0]/30 border-[#E8E6E1] focus-visible:ring-[#111111] font-medium text-[#111111] px-6 text-lg placeholder:text-gray-200"
                />
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[#E8E6E1]">
            <Button
              onClick={handleSavePreferences}
              disabled={saving}
              className="h-16 px-12 rounded-full bg-[#111111] text-white hover:bg-black text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-black/20 transform transition-all active:scale-95 group"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
              ) : (
                <Save className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
              )}
              {saving ? "Synchronizing..." : "Sync Preferences"}
            </Button>
          </div>
        </div>
      </div>

      {/* SECTION 3: LONG-TERM HEURISTICS (MEMORY) */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
          <div className="h-px bg-[#E8E6E1] flex-1" />
          <h2 className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.5em] whitespace-nowrap">Heuristic Manifest</h2>
          <div className="h-px bg-[#E8E6E1] flex-1" />
        </div>

        <div className="bg-[#FDFDFC] rounded-[2.5rem] border border-[#E8E6E1] border-dashed overflow-hidden">
          <div className="p-12 space-y-12">
            <div className="flex items-start justify-between border-b border-[#E8E6E1] pb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-medium text-[#111111]">Agent Memory</h3>
                <p className="text-[10px] uppercase tracking-[0.3em] font-black text-gray-400">Persistent Cognitive Parameters</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-tighter">Live Sync Active</span>
              </div>
            </div>

            {loadingMemories ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-200" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                {/* Visual Settings */}
                <div className="lg:col-span-5 space-y-10">
                  <div className="space-y-6">
                    {/* Style Notes */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Contextual Notes</label>
                      <p className="text-lg font-light text-[#111111] leading-relaxed">
                        {memories.find(m => m.memory_key === 'preferences')?.memory_data?.style_notes || "No heuristics recorded."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 border-t border-[#E8E6E1] pt-8">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Master Tone</label>
                        <p className="font-mono text-sm uppercase text-[#111111]">
                          {memories.find(m => m.memory_key === 'preferences')?.memory_data?.preferred_tone || "Undetermined"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Seniority Target</label>
                        <p className="font-mono text-sm uppercase text-[#111111]">
                          {memories.find(m => m.memory_key === 'preferences')?.memory_data?.target_seniority || "Standard"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Length Constraint</label>
                        <p className="font-mono text-sm uppercase text-[#111111]">
                          {memories.find(m => m.memory_key === 'preferences')?.memory_data?.letter_length_preference || "Optimal"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categorical Manifest */}
                <div className="lg:col-span-7 space-y-10 lg:border-l lg:border-[#E8E6E1] lg:pl-16">
                  <div className="space-y-8">
                    {/* Industries */}
                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Strategic Verticals</label>
                      <div className="flex flex-wrap gap-2">
                        {(memories.find(m => m.memory_key === 'preferences')?.memory_data?.preferred_industries as string[] || []).map((ind, i) => (
                          <span key={i} className="px-5 py-2 rounded-lg bg-white border border-[#E8E6E1] text-[11px] font-medium text-[#111111]">
                            {ind}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Roles */}
                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Functional Ontologies</label>
                      <div className="flex flex-wrap gap-2">
                        {(memories.find(m => m.memory_key === 'preferences')?.memory_data?.preferred_role_types as string[] || []).map((role, i) => (
                          <span key={i} className="px-5 py-2 rounded-lg bg-[#E8E6E1]/30 text-[11px] font-medium text-[#111111]">
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#F4F3F0] border-t border-[#E8E6E1] px-12 py-6 flex justify-between items-center">
            <span className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">
              Ref: {memories.find(m => m.memory_key === 'preferences')?.updated_at
                ? new Date(memories.find(m => m.memory_key === 'preferences')!.updated_at!).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                : 'MANIFEST_SYNCHRONIZING'}
            </span>
            <AlertDialog>
              <AlertDialogTrigger
                className="h-8 px-4 rounded-full text-[10px] font-black uppercase tracking-widest text-[#111111]/30 hover:text-red-600 hover:bg-red-50/50 transition-all"
              >
                Purge Heuristics
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md rounded-3xl border-[#E8E6E1] bg-white p-8">
                <AlertDialogHeader className="space-y-3">
                  <AlertDialogTitle className="text-xl font-semibold text-[#111111]">Purge Memory</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm text-gray-500 leading-relaxed">
                    This action will delete these preferences. Ariadne will lose this contextual data for future sessions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-6">
                  <AlertDialogCancel className="h-10 px-6 rounded-full border-[#E8E6E1] text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#111111]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDeleteMemory('preferences')}
                    className="h-10 px-6 rounded-full bg-red-600 text-white hover:bg-red-700 text-[11px] font-bold uppercase tracking-widest"
                  >
                    Confirm
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}

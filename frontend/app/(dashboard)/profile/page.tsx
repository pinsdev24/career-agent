"use client";

import { useCallback, useEffect, useState } from "react";
import { getProfile, uploadCV, updatePreferences } from "@/lib/api";
import type { Profile, ToneOfVoice } from "@/lib/types";
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
} from "lucide-react";

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

  const loadProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setTone(p.tone_of_voice || "professional");
      setLocation(p.search_preferences?.location || "");
      setContractType(p.search_preferences?.contract_type || "");
      setRemote(p.search_preferences?.remote_preference || "");
      setJobTitle(p.search_preferences?.job_title || "");
    } catch {
      // Profile may not exist yet
    } finally {
      setLoading(false);
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
      setSuccess("CV uploaded and processed successfully!");
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
      setSuccess("Preferences saved!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Upload your CV and set job preferences
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <span className="shrink-0">⚠</span>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* CV Upload */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Curriculum Vitae</CardTitle>
              <CardDescription>
                Upload your CV as a PDF. We&apos;ll extract and structure your
                skills, experience, and education.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-border/60 px-6 py-5 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 group">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
                <div>
                  <p className="font-medium text-sm">
                    {uploading ? "Processing..." : "Click to upload PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF only, max 10MB
                  </p>
                </div>
              </div>
            </label>

            {profile?.cv_raw_text && (
              <Badge
                variant="outline"
                className="gap-1.5 bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
              >
                <FileCheck className="h-3.5 w-3.5" />
                CV uploaded
              </Badge>
            )}
          </div>

          {/* Structured CV preview */}
          {profile?.cv_structured &&
            Object.keys(profile.cv_structured).length > 0 && (
              <div className="rounded-xl border border-border/40 bg-secondary/30 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Extracted Information
                </p>
                {typeof profile.cv_structured.full_name === "string" && (
                  <p className="font-semibold text-lg">
                    {profile.cv_structured.full_name}
                  </p>
                )}
                {Array.isArray(profile.cv_structured.skills) && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.cv_structured.skills.map(
                      (skill: string) => (
                        <Badge key={skill} variant="secondary" className="text-xs bg-primary/10 text-primary/80 border-primary/20">
                          {skill}
                        </Badge>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
        </CardContent>
      </Card>

      <Separator className="bg-border/40" />

      {/* Preferences */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Search Preferences</CardTitle>
              <CardDescription>
                Configure your job search criteria and cover letter tone
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Tone selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Cover Letter Tone</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TONES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                      tone === t.value
                        ? "border-primary bg-primary/10 glow-sm shadow-sm"
                        : "border-border/50 hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 mb-2 ${tone === t.value ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-semibold">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Job search criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="text-sm font-medium flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Backend Engineer"
                className="rounded-xl h-10 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Paris, France"
                className="rounded-xl h-10 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractType" className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Contract Type
              </Label>
              <Input
                id="contractType"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                placeholder="e.g. CDI, freelance"
                className="rounded-xl h-10 bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remote" className="text-sm font-medium flex items-center gap-1.5">
                <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
                Remote Preference
              </Label>
              <Input
                id="remote"
                value={remote}
                onChange={(e) => setRemote(e.target.value)}
                placeholder="e.g. remote, hybrid, onsite"
                className="rounded-xl h-10 bg-background/50"
              />
            </div>
          </div>

          <Button onClick={handleSavePreferences} disabled={saving} className="gap-2 rounded-xl font-semibold">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

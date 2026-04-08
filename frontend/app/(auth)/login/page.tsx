"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/logo";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/callback` },
        });
        if (error) throw error;
        setMessage("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen font-sans bg-[#FDFDFC] text-[#111111] selection:bg-orange-500/30">
      {/* Visual left panel (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative bg-[#F4F3F0] p-12 overflow-hidden flex-col justify-between border-r border-[#E8E6E1]">
        {/* Subtle Background Grid */}
        <div 
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.05]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: "6rem 6rem"
          }}
        />
        
        <div className="relative z-10">
          <Logo />
        </div>

        {/* Decorative 3-Card Graphic to fill empty space */}
        <div className="relative z-10 flex-1 flex items-center justify-center my-8">
          <div className="flex items-center justify-center gap-3 md:gap-5">
            
            {/* Left Card */}
            <div className="relative w-24 h-36 md:w-32 md:h-48 xl:w-40 xl:h-56 rounded-[2rem] overflow-hidden shadow-xl transform -translate-y-4 -rotate-6 hover:rotate-0 hover:z-20 hover:scale-105 transition-all duration-500 border-4 border-white bg-gray-100">
              <Image 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80" 
                alt="Candidate 1" 
                fill 
                className="object-cover"
              />
            </div>

            {/* Center Card (Elevated) */}
            <div className="relative w-28 h-44 md:w-36 md:h-56 xl:w-44 xl:h-64 rounded-[2.2rem] overflow-hidden shadow-2xl z-10 scale-105 hover:scale-110 transition-all duration-500 border-4 border-white bg-gray-100">
              <Image 
                src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80" 
                alt="Candidate 2" 
                fill 
                className="object-cover"
              />
              {/* Floating aesthetic tag */}
              <div className="absolute inset-x-0 bottom-4 flex justify-center">
                <div className="bg-white/90 backdrop-blur-sm text-[#111111] text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hired
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="relative w-24 h-36 md:w-32 md:h-48 xl:w-40 xl:h-56 rounded-[2rem] overflow-hidden shadow-xl transform translate-y-6 rotate-6 hover:rotate-0 hover:z-20 hover:scale-105 transition-all duration-500 border-4 border-white bg-gray-100">
              <Image 
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80" 
                alt="Candidate 3" 
                fill 
                className="object-cover"
              />
            </div>
          </div>
        </div>
        
        <div className="relative z-10 max-w-lg mb-12">
          <h2 className="text-4xl font-medium tracking-tight mb-4 leading-tight">
            Escape the job search labyrinth.
          </h2>
          <p className="text-gray-500 font-light text-lg">
            Join Ariadne to automate your applications, generate tailored cover letters, and maximize your career potential.
          </p>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-12 flex justify-center">
          <Logo />
        </div>

        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-medium tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-gray-500 text-sm font-light">
              {isSignUp 
                ? "Enter your details below to get started." 
                : "Enter your credentials to access your dashboard."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="pl-10 h-12 rounded-xl bg-white border-gray-200 focus:border-[#111111] focus:ring-[#111111]/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="pl-10 h-12 rounded-xl bg-white border-gray-200 focus:border-[#111111] focus:ring-[#111111]/20 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <span className="shrink-0 font-medium">!</span>
                {error}
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <span className="shrink-0 font-medium">✓</span>
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#111111] text-white hover:bg-gray-800 hover:scale-[1.02] transform transition-all font-medium text-sm gap-2"
              disabled={loading}
            >
              {loading ? (
               <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="text-center text-sm text-gray-500 pt-2">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="font-medium text-[#111111] hover:underline underline-offset-4 transition-all"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

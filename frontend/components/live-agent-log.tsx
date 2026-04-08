"use client"

import { useEffect, useState, useRef } from "react"
import { Terminal, Loader2, CheckCircle2, AlertCircle, Cpu } from "lucide-react"
import { cn } from "@/lib/utils"

interface AgentLog {
  type: "info" | "agent_action" | "node_finish" | "error"
  node?: string
  message: string
}

export function LiveAgentLog({ runId }: { runId: string }) {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  useEffect(() => {
    let isActive = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    const connectToStream = async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/pipeline/${runId}/stream`, {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to connect: ${response.statusText}`);
        }

        setIsConnected(true);
        reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          while (isActive) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            
            // Keep the last incomplete chunk in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data:")) {
                try {
                  const dataStr = line.replace("data:", "").trim();
                  if (dataStr) {
                    const newLog = JSON.parse(dataStr) as AgentLog;
                    setLogs((prev) => [...prev, newLog]);
                  }
                } catch (e) {
                  console.error("Failed to parse log event", e, line);
                }
              }
            }
          }
        }
      } catch (err) {
        if (isActive) {
          console.error("Stream connection failed:", err);
          setIsConnected(false);
        }
      }
    };

    connectToStream();

    return () => {
      isActive = false;
      reader?.cancel();
    };
  }, [runId]);

  return (
    <div className="flex flex-col bg-[#111111] overflow-hidden h-[650px] text-gray-400 selection:bg-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-gray-500" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-500">
            Autonomous Processing Core
          </span>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
              <span className="relative flex h-1.5 w-1.5">
                {isConnected ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                )}
              </span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                {isConnected ? "Connection Stable" : "Sync Error"}
              </span>
           </div>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-4 font-mono text-xs custom-scrollbar">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Establishing Agent Secure Link...</span>
          </div>
        ) : (
          logs.map((log, index) => {
            const isLast = index === logs.length - 1;
            return (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-4 transition-all duration-500",
                  isLast ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-1"
                )}
              >
                <div className="mt-0.5 shrink-0 opacity-40">
                  {log.type === "info" && <Terminal className="h-3.5 w-3.5" />}
                  {log.type === "agent_action" && <Cpu className={cn("h-3.5 w-3.5 text-orange-400", isLast && "animate-pulse")} />}
                  {log.type === "node_finish" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                  {log.type === "error" && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
                </div>

                <div className="flex-1 space-y-1">
                  <div className={cn(
                    "leading-relaxed tracking-tight",
                    log.type === "info" && "text-gray-400",
                    log.type === "agent_action" && "text-orange-400/90",
                    log.type === "node_finish" && "text-emerald-400/80 font-medium",
                    log.type === "error" && "text-rose-400 font-semibold"
                  )}>
                    <span className="text-[10px] opacity-20 mr-4 tabular-nums">
                      {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    {log.message}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Terminal Footer */}
      <div className="px-6 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-gray-600">
            <span>Buffer: 1024KB</span>
            <span>Uptime: {logs.length > 0 ? "Active" : "Idle"}</span>
         </div>
         <div className="text-[9px] font-mono text-gray-700">
            {runId}
         </div>
      </div>
    </div>
  )
}

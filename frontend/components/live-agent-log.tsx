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
    <div className="flex flex-col bg-[#1a1a1a] overflow-hidden h-[440px] text-[#888] selection:bg-white/20 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-[#555]" />
          <span className="text-[11px] font-medium text-[#555]">
            Agent Console
          </span>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-md">
          <span className="relative flex h-1.5 w-1.5">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            )}
          </span>
          <span className="text-[10px] font-medium text-[#666]">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1.5 font-mono text-[12px]">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-3">
            <Loader2 className="h-4 w-4 animate-spin text-[#444]" />
            <span className="text-[11px] text-[#444]">Connecting to agent...</span>
          </div>
        ) : (
          logs.map((log, index) => {
            const isLast = index === logs.length - 1;
            return (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-2.5 py-0.5 transition-opacity duration-300",
                  isLast ? "opacity-100" : "opacity-40"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {log.type === "info" && <Terminal className="h-3 w-3 text-[#555]" />}
                  {log.type === "agent_action" && <Cpu className={cn("h-3 w-3 text-amber-400", isLast && "animate-pulse")} />}
                  {log.type === "node_finish" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {log.type === "error" && <AlertCircle className="h-3 w-3 text-red-400" />}
                </div>

                <div className={cn(
                  "flex-1 leading-relaxed",
                  log.type === "info" && "text-[#777]",
                  log.type === "agent_action" && "text-amber-300/80",
                  log.type === "node_finish" && "text-emerald-300/70",
                  log.type === "error" && "text-red-400"
                )}>
                  <span className="text-[10px] opacity-30 mr-3 tabular-nums">
                    {new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  {log.message}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black/20 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-[#444]">
          {logs.length} events
        </span>
        <span className="text-[10px] font-mono text-[#333]">
          {runId.substring(0, 12)}...
        </span>
      </div>
    </div>
  )
}

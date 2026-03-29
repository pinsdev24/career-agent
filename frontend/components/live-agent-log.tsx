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
          // Try reconnecting after 5s or handle failure gracefully.
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
    <div className="flex flex-col rounded-xl border border-border bg-zinc-950 overflow-hidden shadow-2xl h-[600px] text-zinc-300 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agent Terminal
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {isConnected ? "LIVE" : "DISCONNECTED"}
          </span>
        </div>
      </div>

      {/* Logs Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm bg-black/50 backdrop-blur-sm">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Establishing secure hook to pipeline...</span>
          </div>
        ) : (
          logs.map((log, index) => {
            const isLast = index === logs.length - 1;
            return (
              <div 
                key={index} 
                className={cn(
                  "flex items-start gap-3 opacity-90 transition-opacity",
                  isLast && "opacity-100"
                )}
              >
                {/* Icon based on Log Type */}
                <div className="mt-0.5 shrink-0">
                  {log.type === "info" && <Terminal className="h-4 w-4 text-blue-400" />}
                  {log.type === "agent_action" && <Cpu className={cn("h-4 w-4 text-amber-400", isLast && "animate-pulse")} />}
                  {log.type === "node_finish" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {log.type === "error" && <AlertCircle className="h-4 w-4 text-rose-500" />}
                </div>

                {/* Message Content */}
                <div className="flex-1 space-y-1">
                  <div className={cn(
                    "leading-relaxed",
                    log.type === "info" && "text-blue-400",
                    log.type === "agent_action" && "text-amber-400",
                    log.type === "node_finish" && "text-emerald-400 font-medium",
                    log.type === "error" && "text-rose-500 font-semibold"
                  )}>
                    {log.message}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

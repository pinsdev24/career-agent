import type { AgentLogEvent } from "@/lib/types";

const DONE_NODES: Record<string, string> = {
  scout: "done_scout",
  scraper: "done_read",
  matcher: "done_match",
  writer: "done_write",
  critic: "done_critique",
  router: "done_route",
  memory_loader: "done_memory",
  memory_writer: "done_memory",
  hitl_offer_selection: "paused",
  hitl_letter_review: "paused",
};

export function narrativeKey(log: AgentLogEvent): string {
  if (log.code) return log.code;

  const message = (log.message || "").toLowerCase();
  const node = (log.node || "").toLowerCase();

  if (message.includes("pipeline initialized")) return "initialized";
  if (message.includes("cancelled")) return "cancelled";
  if (message.includes("timed out")) return "timeout";
  if (message.includes("pipeline failed") || message.includes("failed to extract")) {
    return "failed";
  }
  if (message.includes("paused for review") || message.includes("waiting for you")) {
    return "paused";
  }
  if (
    message.includes("querying tavily") ||
    message.includes("initiating web search") ||
    message.includes("calling tool") ||
    message.includes("expanding search")
  ) {
    return message.includes("expanding") ? "expanding" : "searching";
  }
  if (message.includes("0 novel")) return "expanding";
  if (message.includes("generating embeddings") || message.includes("pre-score")) {
    return "scoring";
  }
  if (message.includes("found and scored")) return "found_offers";
  if (
    message.includes("extracting content") ||
    message.includes("extracting company") ||
    message.includes("structured extraction") ||
    message.includes("routing raw content")
  ) {
    return "reading_posting";
  }
  if (
    message.includes("gap analysis") ||
    message.includes("cosine") ||
    message.includes("semantic match") ||
    message.includes("context summaries")
  ) {
    return "matching";
  }
  if (
    message.includes("writer") ||
    (message.includes("draft") && message.includes("letter") && !message.includes("critic"))
  ) {
    return "writing";
  }
  if (message.includes("critic") || message.includes("quality dimension")) {
    return "critiquing";
  }

  if (log.type === "node_finish") {
    return DONE_NODES[node] || "working";
  }
  if (log.type === "error") return "failed";
  return "working";
}

export function softenLogMessage(message: string): string {
  return message
    .replace(
      /^(Scout|Matcher|Writer|Critic|Scraper|Router|Memory Loader|Memory Writer):\s*/i,
      ""
    )
    .replace(/Agent is calling tool:\s*/i, "")
    .replace(/Completed step:\s*/i, "")
    .replace(/\bTavily\b/gi, "the web")
    .replace(/\bLLM\b/g, "the writer")
    .replace(/cosine similarity/gi, "how well you fit")
    .replace(/_/g, " ")
    .trim();
}

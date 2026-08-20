import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function careerAgentOrigin(): string {
  return (process.env.CAREERAGENT_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const auth = request.headers.get("authorization");

  const upstream = await fetch(
    `${careerAgentOrigin()}/pipeline/${encodeURIComponent(runId)}/stream`,
    {
      headers: {
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: "no-store",
    }
  );

  if (!upstream.body) {
    return new Response(await upstream.text(), { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

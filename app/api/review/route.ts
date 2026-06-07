import { runReview } from "@/lib/agent/pipeline";
import { type ReviewEvent, encodeEvent } from "@/lib/events";

export const runtime = "nodejs";
// Generous ceiling for a multi-step agent; Hobby caps at 300, Pro allows 800.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input = "";
  try {
    const body = (await req.json()) as { input?: unknown };
    if (typeof body.input === "string") input = body.input.trim();
  } catch {
    /* handled below */
  }

  if (!input) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ReviewEvent) => {
        try {
          controller.enqueue(encodeEvent(e));
        } catch {
          /* client disconnected */
        }
      };
      try {
        await runReview(input.slice(0, 8000), emit);
      } catch (err) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "review failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // Defeat proxy/CDN buffering so events render incrementally on the
      // deployed URL, not as one batch (adversarial review W1).
      "Cache-Control": "no-cache, no-store, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

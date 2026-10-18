import { maybeRunScheduledDigest } from "@/lib/digest";

// Optional: for hosts that prefer an external scheduler. The app also checks on its own every few minutes.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await maybeRunScheduledDigest());
}

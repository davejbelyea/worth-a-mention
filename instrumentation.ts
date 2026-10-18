// Runs once when the server starts. Keeps a light timer that publishes the
// Thursday newsletter at the time the founder picked (Eastern time).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_SCHEDULER === "1") return;
  const { maybeRunScheduledDigest } = await import("./lib/digest");
  const tick = () => maybeRunScheduledDigest().catch((e) => console.error("[digest] scheduler error", e));
  setTimeout(tick, 15_000);
  setInterval(tick, 5 * 60_000);
}

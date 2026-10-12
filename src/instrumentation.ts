// Runs once when the server starts. Kicks off the every-minute background jobs.
export async function register() {
  // Wrapped in the if-block (not an early return) so Next can drop it from the edge bundle.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}

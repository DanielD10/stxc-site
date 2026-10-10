import { log } from "./log.js";

// Runs middleware in order. Each one calls next() to continue
// or sends a response to stop the chain.
// Any unexpected error becomes a clean 500 instead of a crash.
export function compose(...steps) {
  return async function handler(req, res) {
    let last = -1;
    const run = async (i) => {
      if (i <= last) throw new Error("next() called twice");
      last = i;
      const step = steps[i];
      if (step) await step(req, res, () => run(i + 1));
    };
    try {
      await run(0);
    } catch (err) {
      log("error", { id: req.id, event: "unhandled", msg: err && err.message });
      if (!res.headersSent) {
        res.status(500).json({
          ok: false,
          error: "Something went wrong on our end. Please call or email us directly.",
        });
      }
    }
  };
}

// Phase 0: confirm the site can reach the Worker.
(async function () {
  const el = document.getElementById("status");
  const base = window.GAMEDAY_CONFIG.workerUrl;
  try {
    const res = await fetch(`${base}/health`);
    const data = await res.json();
    if (!data.ok) throw new Error("Worker returned not ok");
    const missing = [];
    if (!data.hasOddsKey) missing.push("ODDS_API_KEY secret");
    if (!data.hasKv) missing.push("KV namespace");
    el.textContent = missing.length
      ? `Worker OK — missing: ${missing.join(", ")}`
      : "Worker OK";
    el.className = missing.length ? "warn" : "ok";
  } catch (err) {
    el.textContent = `Worker not reachable (${err.message}). Check docs/config.js.`;
    el.className = "err";
  }
})();

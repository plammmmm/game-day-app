// Pure slate logic — no DOM. Used by app.js and by docs/test/slate.test.js.
(function (root) {
  const TZ = "America/Chicago";

  const ctDate = (iso) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

  const ctKickoff = (iso) =>
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  // Today's games (CT). If none, the next day that has games.
  function pickSlate(games, nowMs) {
    const today = ctDate(new Date(nowMs).toISOString());
    const todays = games.filter((g) => ctDate(g.kickoff) === today);
    if (todays.length) return { label: "Today", games: sortGames(todays) };
    const upcoming = games.filter((g) => Date.parse(g.kickoff) > nowMs).sort(byKick);
    if (!upcoming.length) return { label: "No upcoming games", games: [] };
    const next = ctDate(upcoming[0].kickoff);
    const day = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "short", day: "numeric" })
      .format(new Date(upcoming[0].kickoff));
    return { label: `Next slate · ${day}`, games: sortGames(upcoming.filter((g) => ctDate(g.kickoff) === next)) };
  }
  const byKick = (a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff);
  const sortGames = (gs) => [...gs].sort((a, b) => (a.live - b.live) || byKick(a, b));

  // Movement from opener to current consensus. Positive spread move = line moved toward the away team.
  function movement(opener, current) {
    if (!opener || current.spreadHome == null) return null;
    return {
      spread: round(current.spreadHome - opener.spreadHome),
      total: current.total != null && opener.total != null ? round(current.total - opener.total) : null,
    };
  }
  const round = (x) => Math.round(x * 10) / 10;

  // Best price per side. Spread/total: best number first, then best price at that number.
  function bestPrices(books) {
    const best = {};
    const pick = (key, val, tie) => {
      let top = null;
      for (const b of books) {
        const v = val(b); if (v == null) continue;
        const t = tie(b);
        if (!top || v > top.v || (v === top.v && t > top.t)) top = { v, t, book: b.book };
      }
      if (top) best[key] = top.book;
    };
    pick("spreadHome", (b) => b.spread?.home, (b) => b.spread?.homePrice);
    pick("spreadAway", (b) => b.spread?.away, (b) => b.spread?.awayPrice);
    pick("over", (b) => (b.total ? -b.total.points : null), (b) => b.total?.overPrice);
    pick("under", (b) => b.total?.points, (b) => b.total?.underPrice);
    pick("mlHome", (b) => b.ml?.home, () => 0);
    pick("mlAway", (b) => b.ml?.away, () => 0);
    return best;
  }

  const fmtPrice = (p) => (p == null ? "—" : p > 0 ? `+${p}` : `${p}`);
  const fmtPoint = (p) => (p == null ? "—" : p > 0 ? `+${p}` : p === 0 ? "PK" : `${p}`);

  const minutesAgo = (iso, nowMs) => Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60000));

  const api = { ctDate, ctKickoff, pickSlate, movement, bestPrices, fmtPrice, fmtPoint, minutesAgo };
  if (typeof module !== "undefined") module.exports = api; else root.Slate = api;
})(this);

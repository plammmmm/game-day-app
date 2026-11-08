// v1.1 slate board.
(function () {
  const S = window.Slate;
  const cfg = window.GAMEDAY_CONFIG;
  const sampleMode = !cfg.workerUrl || cfg.workerUrl.includes("REPLACE") || location.hash === "#sample";
  const $ = (id) => document.getElementById(id);
  const state = { data: null, showOffshore: false, showLive: false };

  const BOOK_NAMES = {
    draftkings: "DraftKings", fanduel: "FanDuel", betmgm: "BetMGM", betrivers: "BetRivers",
    williamhill_us: "Caesars", espnbet: "ESPN BET", fanatics: "Fanatics", bovada: "Bovada",
    betus: "BetUS", lowvig: "LowVig", mybookieag: "MyBookie", betonlineag: "BetOnline",
  };
  const BOOK_SHORT = {
    draftkings: "DK", fanduel: "FD", betmgm: "MGM", betrivers: "BR", williamhill_us: "CZR", espnbet: "ESPN",
    fanatics: "FAN", bovada: "BOV", betus: "BUS", lowvig: "LV", mybookieag: "MYB", betonlineag: "BOL",
  };
  const bookName = (k) => `<span class="full">${esc(BOOK_NAMES[k] || k)}</span><span class="short">${esc(BOOK_SHORT[k] || k)}</span>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  async function load() {
    setStatus("Loading…");
    $("refresh").disabled = true;
    try {
      const url = sampleMode ? "data/sample-odds.json" : `${cfg.workerUrl}/odds?sport=nfl`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.error && !data.games) throw new Error(data.error || `HTTP ${res.status}`);
      state.data = data;
      render();
    } catch (err) {
      setStatus(`Couldn't load odds: ${err.message}`, "err");
    } finally {
      $("refresh").disabled = false;
    }
  }

  function setStatus(text, cls = "") { const el = $("status"); el.textContent = text; el.className = `status ${cls}`; }

  function render() {
    const d = state.data;
    const now = sampleMode ? Date.parse(d.fetchedAt) : Date.now();
    const slate = S.pickSlate(d.games, now);
    const live = slate.games.filter((g) => g.live);
    const games = state.showLive ? slate.games : slate.games.filter((g) => !g.live);

    const notes = [];
    if (sampleMode) notes.push("Sample data from a real pull on Nov 8, 12:17 CT");
    else notes.push(`Updated ${S.minutesAgo(d.fetchedAt, now)} min ago${d.cached ? " (cached)" : ""}`);
    if (d.paused) notes.push("Credit limit reached, showing last pull");
    if (d.error) notes.push(`Last refresh failed: ${d.error}`);
    setStatus(notes.join(" · "), d.paused || d.error ? "warn" : "");

    $("slate-label").textContent = slate.label;
    $("live-toggle-wrap").hidden = live.length === 0;
    $("live-count").textContent = live.length;

    $("games").innerHTML = games.length
      ? games.map((g) => card(g, d.openers?.[g.id])).join("")
      : `<p class="empty">${live.length ? "All of today's games have started. Turn on “Show started games” to see live lines." : "No games to show."}</p>`;
  }

  function card(g, opener) {
    const books = g.books.filter((b) => state.showOffshore || b.us);
    const best = S.bestPrices(books);
    const mv = S.movement(opener, g.consensus);
    const cur = g.consensus;

    const moveTxt = (delta) => delta == null ? "" : delta === 0 ? `<span class="mv flat">no move</span>`
      : `<span class="mv ${delta > 0 ? "up" : "down"}">${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}</span>`;

    const lineRow = opener
      ? `<div class="lines">
           <div><span class="lbl">Spread</span> ${esc(g.home)} <b>${S.fmtPoint(cur.spreadHome)}</b>
             <span class="open">open ${S.fmtPoint(opener.spreadHome)}</span> ${moveTxt(mv?.spread)}</div>
           <div><span class="lbl">Total</span> <b>${cur.total ?? "—"}</b>
             <span class="open">open ${opener.total ?? "—"}</span> ${moveTxt(mv?.total)}</div>
         </div>`
      : `<div class="lines">
           <div><span class="lbl">Spread</span> ${esc(g.home)} <b>${S.fmtPoint(cur.spreadHome)}</b> <span class="open">no opener yet</span></div>
           <div><span class="lbl">Total</span> <b>${cur.total ?? "—"}</b></div>
         </div>`;

    const cell = (on, html) => `<td class="${on ? "best" : ""}">${html}</td>`;
    const rows = books.map((b) => `<tr>
        <th>${bookName(b.book)}</th>
        ${cell(best.spreadAway === b.book, b.spread ? `${S.fmtPoint(b.spread.away)} <small>${S.fmtPrice(b.spread.awayPrice)}</small>` : "—")}
        ${cell(best.spreadHome === b.book, b.spread ? `${S.fmtPoint(b.spread.home)} <small>${S.fmtPrice(b.spread.homePrice)}</small>` : "—")}
        ${cell(best.over === b.book, b.total ? `o${b.total.points} <small>${S.fmtPrice(b.total.overPrice)}</small>` : "—")}
        ${cell(best.under === b.book, b.total ? `u${b.total.points} <small>${S.fmtPrice(b.total.underPrice)}</small>` : "—")}
        ${cell(best.mlAway === b.book, b.ml ? S.fmtPrice(b.ml.away) : "—")}
        ${cell(best.mlHome === b.book, b.ml ? S.fmtPrice(b.ml.home) : "—")}
      </tr>`).join("");

    return `<article class="card game${g.live ? " is-live" : ""}">
      <header class="game-head">
        <h2>${esc(g.away)} <span class="at">@</span> ${esc(g.home)}</h2>
        <span class="kick">${g.live ? `<span class="live">LIVE</span>` : S.ctKickoff(g.kickoff)}</span>
      </header>
      <p class="names">${esc(g.awayName)} at ${esc(g.homeName)}</p>
      ${lineRow}
      <div class="scroll"><table>
        <thead>
          <tr><th rowspan="2">Book</th><th colspan="2">Spread</th><th colspan="2">Total</th><th colspan="2">Moneyline</th></tr>
          <tr><th>${esc(g.away)}</th><th>${esc(g.home)}</th><th>Over</th><th>Under</th><th>${esc(g.away)}</th><th>${esc(g.home)}</th></tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7">No US books have posted lines yet.</td></tr>`}</tbody>
      </table></div>
    </article>`;
  }

  $("refresh").addEventListener("click", load);
  $("offshore").addEventListener("change", (e) => { state.showOffshore = e.target.checked; if (state.data) render(); });
  $("show-live").addEventListener("change", (e) => { state.showLive = e.target.checked; if (state.data) render(); });
  load();
})();

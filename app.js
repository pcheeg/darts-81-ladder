const RUNS_KEY = "81SurvivalLadderRuns";
const CURRENT_KEY = "81SurvivalLadderCurrentRun";
const START_SCORE = 81;
const END_SCORE = 170;
const MAX_LIVES = 3;

let runs = loadRuns();
let currentRun = loadCurrentRun() || createRun();

const $ = (id) => document.getElementById(id);

const els = {
  headerBest: $("headerBest"),
  runsPlayed: $("runsPlayed"),
  todayBest: $("todayBest"),
  currentScore: $("currentScore"),
  scoreWrap: $("scoreWrap"),
  lives: $("lives"),
  newBest: $("newBest"),
  statusMessage: $("statusMessage"),
  hit3Btn: $("hit3Btn"),
  hit6Btn: $("hit6Btn"),
  missBtn: $("missBtn"),
  undoBtn: $("undoBtn"),
  newRunBtn: $("newRunBtn"),
  statRuns: $("statRuns"),
  statBest: $("statBest"),
  statToday: $("statToday"),
  statAverage: $("statAverage"),
  statCompleted: $("statCompleted"),
  statLivesEarned: $("statLivesEarned"),
  statLivesLost: $("statLivesLost"),
  statHit3Pct: $("statHit3Pct"),
  statHit6Pct: $("statHit6Pct"),
  statMissPct: $("statMissPct"),
  statsTable: $("statsTable"),
  resetBtn: $("resetBtn")
};

function createRun() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    startedAt: new Date().toISOString(),
    endedAt: null,
    completed: false,
    startScore: START_SCORE,
    endScore: START_SCORE,
    maxScoreReached: START_SCORE,
    livesAtEnd: 0,
    currentScore: START_SCORE,
    lives: 0,
    attempts: []
  };
}

function loadRuns() {
  try {
    return JSON.parse(localStorage.getItem(RUNS_KEY)) || [];
  } catch {
    return [];
  }
}

function loadCurrentRun() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_KEY));
  } catch {
    return null;
  }
}

function saveRuns() {
  localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

function saveCurrent() {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentRun));
}

function clearCurrent() {
  localStorage.removeItem(CURRENT_KEY);
}

function allRuns() {
  return [...runs, currentRun].filter(Boolean);
}

function isRunEnded() {
  return Boolean(currentRun.endedAt);
}

function finishRun(completed = false) {
  currentRun.endedAt = new Date().toISOString();
  currentRun.completed = completed;
  currentRun.endScore = currentRun.currentScore;
  currentRun.livesAtEnd = currentRun.lives;
  runs.push(currentRun);
  saveRuns();
  clearCurrent();
}

function newRun(force = false) {
  if (!force && currentRun.attempts.length && !isRunEnded()) {
    const ok = confirm("Start a new run? Your current run will be saved as ended.");
    if (!ok) return;
    finishRun(false);
  }
  currentRun = createRun();
  saveCurrent();
  render("New run started. Begin on 81.");
}

function record(result) {
  if (isRunEnded()) {
    currentRun = createRun();
  }

  const scoreBefore = currentRun.currentScore;
  const livesBefore = currentRun.lives;
  let scoreAfter = scoreBefore;
  let livesAfter = livesBefore;
  let ended = false;
  let completed = false;

  if (result === "hit3") {
    livesAfter = Math.min(MAX_LIVES, livesBefore + 1);
    if (scoreBefore === END_SCORE) {
      ended = true;
      completed = true;
    } else {
      scoreAfter = scoreBefore + 1;
    }
  }

  if (result === "hit6") {
    if (scoreBefore === END_SCORE) {
      ended = true;
      completed = true;
    } else {
      scoreAfter = scoreBefore + 1;
    }
  }

  if (result === "miss") {
    if (livesBefore > 0) {
      livesAfter = livesBefore - 1;
      scoreAfter = scoreBefore;
    } else {
      ended = true;
    }
  }

  currentRun.attempts.push({
    score: scoreBefore,
    result,
    livesBefore,
    livesAfter,
    scoreBefore,
    scoreAfter,
    wasEndedBefore: false,
    endedAfter: ended,
    completedAfter: completed,
    timestamp: new Date().toISOString()
  });

  currentRun.currentScore = scoreAfter;
  currentRun.lives = livesAfter;
  currentRun.maxScoreReached = Math.max(currentRun.maxScoreReached, scoreBefore, scoreAfter);
  currentRun.endScore = scoreBefore;
  currentRun.livesAtEnd = livesAfter;

  if (ended) {
    finishRun(completed);
    const message = completed ? "🏆 Ladder complete! You checked out 170." : `Run over. You reached ${scoreBefore}.`;
    currentRun = createRun();
    render(message, result);
    return;
  }

  saveCurrent();
  const message = result === "hit3"
    ? "Great shot. +1 life."
    : result === "hit6"
      ? "Checkout hit. Move up."
      : "Life lost. Try the same score again.";
  render(message, result);
}

function undo() {
  let sourceRun = currentRun;

  if (!currentRun.attempts.length && runs.length) {
    const lastSaved = runs[runs.length - 1];
    if (lastSaved.attempts.length) {
      sourceRun = runs.pop();
      saveRuns();
    }
  }

  if (!sourceRun.attempts.length) {
    render("Nothing to undo.");
    return;
  }

  const last = sourceRun.attempts.pop();
  sourceRun.endedAt = null;
  sourceRun.completed = false;
  sourceRun.currentScore = last.scoreBefore;
  sourceRun.lives = last.livesBefore;
  sourceRun.endScore = last.scoreBefore;
  sourceRun.livesAtEnd = last.livesBefore;
  sourceRun.maxScoreReached = Math.max(
    START_SCORE,
    ...sourceRun.attempts.map(a => Math.max(a.scoreBefore, a.scoreAfter))
  );

  currentRun = sourceRun;
  saveRuns();
  saveCurrent();
  render("Last action undone.");
}

function getStats() {
  const completedRuns = runs;
  const combined = allRuns();
  const totalRuns = completedRuns.length;
  const best = combined.reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);
  const today = new Date().toISOString().slice(0, 10);
  const todayBest = combined
    .filter(r => (r.startedAt || "").slice(0, 10) === today)
    .reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);

  const avg = completedRuns.length
    ? completedRuns.reduce((sum, r) => sum + (r.maxScoreReached || START_SCORE), 0) / completedRuns.length
    : START_SCORE;

  const attempts = combined.flatMap(r => r.attempts || []);
  const hit3 = attempts.filter(a => a.result === "hit3").length;
  const hit6 = attempts.filter(a => a.result === "hit6").length;
  const miss = attempts.filter(a => a.result === "miss").length;
  const totalAttempts = attempts.length || 1;

  return {
    totalRuns,
    best,
    todayBest,
    avg,
    completed: completedRuns.filter(r => r.completed).length,
    livesEarned: attempts.filter(a => a.result === "hit3" && a.livesAfter > a.livesBefore).length,
    livesLost: attempts.filter(a => a.result === "miss" && a.livesAfter < a.livesBefore).length,
    hit3Pct: pct(hit3, totalAttempts),
    hit6Pct: pct(hit6, totalAttempts),
    missPct: pct(miss, totalAttempts),
    attempts
  };
}

function pct(n, d) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function renderStatsTable(attempts) {
  const rows = [];
  for (let score = START_SCORE; score <= END_SCORE; score++) {
    const scoreAttempts = attempts.filter(a => a.score === score);
    const total = scoreAttempts.length;
    const hit3 = scoreAttempts.filter(a => a.result === "hit3").length;
    const hit6 = scoreAttempts.filter(a => a.result === "hit6").length;
    const misses = scoreAttempts.filter(a => a.result === "miss").length;
    rows.push(`
      <tr>
        <td>${score}</td>
        <td>${total}</td>
        <td>${hit3}</td>
        <td>${hit6}</td>
        <td>${misses}</td>
        <td>${pct(hit3, total)}</td>
        <td>${pct(hit6, total)}</td>
        <td>${pct(hit3 + hit6, total)}</td>
      </tr>
    `);
  }
  els.statsTable.innerHTML = rows.join("");
}

function render(message = "", animationType = "") {
  const s = getStats();

  els.headerBest.textContent = s.best;
  els.runsPlayed.textContent = s.totalRuns;
  els.todayBest.textContent = s.todayBest;
  els.currentScore.textContent = currentRun.currentScore;
  els.lives.textContent = Array.from({ length: MAX_LIVES }, (_, i) => i < currentRun.lives ? "♥" : "♡").join(" ");
  els.statusMessage.textContent = message || "Start on 81. Hit in 3 earns a life.";

  els.statRuns.textContent = s.totalRuns;
  els.statBest.textContent = s.best;
  els.statToday.textContent = s.todayBest;
  els.statAverage.textContent = s.avg.toFixed(1);
  els.statCompleted.textContent = s.completed;
  els.statLivesEarned.textContent = s.livesEarned;
  els.statLivesLost.textContent = s.livesLost;
  els.statHit3Pct.textContent = s.hit3Pct;
  els.statHit6Pct.textContent = s.hit6Pct;
  els.statMissPct.textContent = s.missPct;
  renderStatsTable(s.attempts);

  els.currentScore.classList.remove("bump");
  void els.currentScore.offsetWidth;
  els.currentScore.classList.add("bump");

  els.lives.classList.remove("gain", "lose");
  if (animationType === "hit3") els.lives.classList.add("gain");
  if (animationType === "miss") els.lives.classList.add("lose");

  const previousBest = runs.slice(0, -1).reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);
  const currentBest = s.best;
  if (currentBest > previousBest && currentBest > START_SCORE && animationType && animationType !== "miss") {
    els.newBest.classList.remove("hidden");
    setTimeout(() => els.newBest.classList.add("hidden"), 1600);
  }
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  $(viewId).classList.add("active");
  document.querySelector(`[data-view="${viewId}"]`).classList.add("active");
  render();
}

els.hit3Btn.addEventListener("click", () => record("hit3"));
els.hit6Btn.addEventListener("click", () => record("hit6"));
els.missBtn.addEventListener("click", () => record("miss"));
els.undoBtn.addEventListener("click", undo);
els.newRunBtn.addEventListener("click", () => newRun(false));

els.resetBtn.addEventListener("click", () => {
  const ok = confirm("Delete all 81 Survival Ladder data from this device?");
  if (!ok) return;
  localStorage.removeItem(RUNS_KEY);
  localStorage.removeItem(CURRENT_KEY);
  runs = [];
  currentRun = createRun();
  saveCurrent();
  render("All data reset.");
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

saveCurrent();
render();

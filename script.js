/* ==========================================================
   솔랭내기 스코어보드 - 상태 관리 + 로직
   ========================================================== */

const STORAGE_KEY = "lol-solo-tracker-state-v1";

// 연승 보너스: 게임 전체에서 "가장 길었던 연승" 하나만 기준으로 1회 지급
// 3연승 +5, 4연승 +15, 5연승 +30, 6연승 +50, 7연승 +75 ... 규칙적으로 증가 (계차가 +5씩 커짐)
// 공식: 2.5 * (n-1) * (n-2)  (n < 3이면 0)
function streakBonus(n) {
  if (n < 3) return 0;
  return 2.5 * (n - 1) * (n - 2);
}

// deeplol.gg 기준 "반짝이는 판(하이라이트)" 표시된 경기에 주는 보너스 점수
const HIGHLIGHT_BONUS = 20;

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("state load 실패", e); }
  return { players: [], matches: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ---------- 통계 재계산 ----------
   match 삭제/추가 시마다 전체를 처음부터 다시 계산해서
   연승/보너스 계산이 항상 정확하도록 함 */
function recomputeAll() {
  state.players.forEach(p => {
    p.wins = 0;
    p.losses = 0;
    p.streak = 0;
    p.maxStreak = 0;
    p.winScoreSum = 0;
    p.highlightScoreSum = 0;
  });

  const sorted = [...state.matches].sort((a, b) => a.ts - b.ts);

  for (const m of sorted) {
    const p = state.players.find(pl => pl.id === m.playerId);
    if (!p) continue;

    if (m.result === "win") {
      p.wins++;
      p.streak++;
      p.winScoreSum += m.score;
      if (p.streak > p.maxStreak) p.maxStreak = p.streak;
    } else {
      p.losses++;
      p.streak = 0;
      p.winScoreSum -= m.score;
    }

    if (m.highlight) {
      p.highlightScoreSum += HIGHLIGHT_BONUS;
    }
  }

  // 연승 보너스는 "가장 길었던 연승" 하나만 기준으로 1회 계산
  state.players.forEach(p => {
    p.bonusScoreSum = streakBonus(p.maxStreak);
  });
}

function totalGames(p) { return p.wins + p.losses; }
function totalScore(p) { return p.winScoreSum + p.bonusScoreSum + p.highlightScoreSum; }

/* ==========================================================
   참가자 추가
   ========================================================== */
const addForm = document.getElementById("addForm");
const nameInput = document.getElementById("nameInput");
const teamPick = document.getElementById("teamPick");
let selectedTeam = 1;

teamPick.addEventListener("click", (e) => {
  const btn = e.target.closest(".team-btn");
  if (!btn) return;
  selectedTeam = Number(btn.dataset.team);
  [...teamPick.children].forEach(b => b.classList.toggle("active", b === btn));
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  state.players.push({
    id: crypto.randomUUID(),
    name,
    team: selectedTeam,
    wins: 0, losses: 0, streak: 0, maxStreak: 0,
    winScoreSum: 0, bonusScoreSum: 0, highlightScoreSum: 0
  });

  nameInput.value = "";
  saveState();
  renderAll();
});

/* ==========================================================
   경기 결과 기록
   ========================================================== */
const matchForm = document.getElementById("matchForm");
const playerSelect = document.getElementById("playerSelect");
const resultPick = document.getElementById("resultPick");
const championInput = document.getElementById("championInput");
const highlightInput = document.getElementById("highlightInput");
const lastMatchHint = document.getElementById("lastMatchHint");

let selectedResult = "win";

// 18~23 사이 정수를 무작위로 반환
function randomScore() {
  return Math.floor(Math.random() * (23 - 18 + 1)) + 18;
}

resultPick.addEventListener("click", (e) => {
  const btn = e.target.closest(".result-btn");
  if (!btn) return;
  selectedResult = btn.dataset.result;
  [...resultPick.children].forEach(b => b.classList.toggle("active", b === btn));
});

matchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const playerId = playerSelect.value;
  if (!playerId) return;

  const match = {
    id: crypto.randomUUID(),
    playerId,
    result: selectedResult,
    score: randomScore(),
    champion: championInput.value.trim(),
    highlight: highlightInput.checked,
    ts: Date.now()
  };

  state.matches.push(match);
  recomputeAll();
  saveState();
  renderAll();

  const p = state.players.find(pl => pl.id === playerId);
  const resTxt = selectedResult === "win" ? "승리" : "패배";
  const highlightTxt = match.highlight ? ` · 🌟 +${HIGHLIGHT_BONUS}` : "";
  lastMatchHint.textContent = `${p.name} · ${resTxt} (${match.score}점 랜덤 부여)${highlightTxt} · 총점 ${totalScore(p)}점`;
  championInput.value = "";
  highlightInput.checked = false;
});

/* ==========================================================
   렌더링
   ========================================================== */
function renderPlayerSelect() {
  const current = playerSelect.value;
  playerSelect.innerHTML = `<option value="" disabled ${current ? "" : "selected"}>참가자 선택</option>`;
  state.players.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (팀${p.team})`;
    playerSelect.appendChild(opt);
  });
  if (current && state.players.some(p => p.id === current)) {
    playerSelect.value = current;
  }
}

function renderScoreTable() {
  const tbody = document.getElementById("scoreBody");
  tbody.innerHTML = "";

  const ranked = [...state.players].sort((a, b) => totalScore(b) - totalScore(a));

  ranked.forEach((p, idx) => {
    const tr = document.createElement("tr");
    if (idx === 0 && ranked.length > 0 && totalScore(p) > 0) tr.classList.add("rank-1");

    const winClass = p.winScoreSum >= 0 ? "pos-score" : "neg-score";
    const totalClass = totalScore(p) >= 0 ? "pos-score" : "neg-score";

    tr.innerHTML = `
      <td><span class="rank-badge">${idx + 1}</span></td>
      <td>${escapeHtml(p.name)}</td>
      <td><span class="team-tag t${p.team}">팀${p.team}</span></td>
      <td>${totalGames(p)}</td>
      <td class="win-cell">${p.wins}</td>
      <td class="loss-cell">${p.losses}</td>
      <td class="streak-cell">${p.streak > 0 ? p.streak + "연승" : "-"}</td>
      <td class="streak-cell">${p.maxStreak > 0 ? p.maxStreak + "연승" : "-"}</td>
      <td class="${winClass}">${p.winScoreSum}</td>
      <td class="bonus-cell">${p.bonusScoreSum > 0 ? "+" + p.bonusScoreSum : 0}</td>
      <td class="highlight-cell">${p.highlightScoreSum > 0 ? "+" + p.highlightScoreSum : 0}</td>
      <td class="total-cell ${totalClass}">${totalScore(p)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderTeamSummary() {
  const box = document.getElementById("teamSummary");
  box.innerHTML = "";

  [1, 2].forEach(teamNo => {
    const members = state.players.filter(p => p.team === teamNo);
    const games = members.reduce((s, p) => s + totalGames(p), 0);
    const wins = members.reduce((s, p) => s + p.wins, 0);
    const losses = members.reduce((s, p) => s + p.losses, 0);
    const score = members.reduce((s, p) => s + totalScore(p), 0);

    const card = document.createElement("div");
    card.className = `team-card t${teamNo}`;
    card.innerHTML = `
      <h4>팀${teamNo}</h4>
      <p>총판수 <span>${games}</span> · 승 <span>${wins}</span> · 패 <span>${losses}</span> · 팀 점수 합산 <span>${score}</span></p>
    `;
    box.appendChild(card);
  });
}

let logFilter = "all"; // "all" 또는 참가자 id

function renderLogFilter() {
  const box = document.getElementById("logFilter");
  box.innerHTML = "";

  if (state.players.length === 0) return;

  // 필터 기본값이 삭제된 참가자를 가리키면 전체로 복귀
  if (logFilter !== "all" && !state.players.some(p => p.id === logFilter)) {
    logFilter = "all";
  }

  const makeBtn = (id, label, count) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "log-filter-btn" + (logFilter === id ? " active" : "");
    btn.innerHTML = `${escapeHtml(label)}<span class="log-filter-count">${count}</span>`;
    btn.addEventListener("click", () => {
      logFilter = id;
      renderLogFilter();
      renderLog();
    });
    box.appendChild(btn);
  };

  makeBtn("all", "전체", state.matches.length);
  state.players.forEach(p => {
    const count = state.matches.filter(m => m.playerId === p.id).length;
    makeBtn(p.id, p.name, count);
  });
}

function renderLog() {
  const log = document.getElementById("matchLog");
  log.innerHTML = "";

  const filtered = logFilter === "all"
    ? state.matches
    : state.matches.filter(m => m.playerId === logFilter);

  const sorted = [...filtered].sort((a, b) => b.ts - a.ts).slice(0, 60);

  if (sorted.length === 0) {
    log.innerHTML = `<li class="log-empty">아직 기록된 경기가 없습니다</li>`;
    return;
  }

  sorted.forEach(m => {
    const p = state.players.find(pl => pl.id === m.playerId);
    const name = p ? p.name : "(삭제된 참가자)";
    const resClass = m.result === "win" ? "log-result-win" : "log-result-lose";
    const resTxt = m.result === "win" ? `+${m.score}` : `-${m.score}`;
    const champ = m.champion ? `<span class="log-champ">${escapeHtml(m.champion)}</span>` : "";
    const star = m.highlight ? `<span class="log-star" title="반짝이는 판 +${HIGHLIGHT_BONUS}">🌟</span>` : "";
    const time = new Date(m.ts).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const li = document.createElement("li");
    if (m.highlight) li.classList.add("is-highlight");
    // 전체 보기일 때만 이름을 표시해서, 특정 참가자 필터일 때는 결과 위주로 간결하게 보이도록 함
    const nameTag = logFilter === "all" ? `<strong>${escapeHtml(name)}</strong>` : "";
    li.innerHTML = `
      <span class="log-left">
        ${nameTag}
        <span class="${resClass}">${resTxt}</span>
        ${star}
        ${champ}
      </span>
      <span class="log-left">
        <span class="log-champ">${time}</span>
        <button class="delete-row-btn" data-id="${m.id}" title="이 기록 삭제">✕</button>
      </span>
    `;
    log.appendChild(li);
  });

  log.querySelectorAll(".delete-row-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.matches = state.matches.filter(m => m.id !== btn.dataset.id);
      recomputeAll();
      saveState();
      renderAll();
    });
  });
}

function renderHeroStats() {
  document.getElementById("statTotalGames").textContent = state.matches.length;

  if (state.players.length === 0) {
    document.getElementById("statLeader").textContent = "-";
    document.getElementById("statLeaderScore").textContent = "0";
    return;
  }
  const leader = [...state.players].sort((a, b) => totalScore(b) - totalScore(a))[0];
  document.getElementById("statLeader").textContent = leader.name;
  document.getElementById("statLeaderScore").textContent = totalScore(leader);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function renderAll() {
  renderPlayerSelect();
  renderScoreTable();
  renderTeamSummary();
  renderLogFilter();
  renderLog();
  renderHeroStats();
}

/* ---------- 초기화 버튼 ---------- */
document.getElementById("resetBtn").addEventListener("click", () => {
  if (!confirm("모든 참가자와 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
  state = { players: [], matches: [] };
  saveState();
  renderAll();
});

/* ---------- 시작 ---------- */
recomputeAll();
renderAll();

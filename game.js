(function () {
  const STORAGE_KEY = "rock-clicker-high";
  const COIN_SAVE_INTERVAL = 5000; // 5초마다 서버에 저장

  const rock = document.getElementById("rock");
  const stage = document.getElementById("stage");
  const crackLayer = document.getElementById("crackLayer");
  const hpFill = document.getElementById("hpFill");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("highScore");
  const brokenEl = document.getElementById("broken");
  const comboEl = document.getElementById("combo");
  const coinCountEl = document.getElementById("coinCount");

  // ALP 로그인 연동
  const urlParams = new URLSearchParams(window.location.search);
  const alpToken = urlParams.get('token');
  const platformApi = window.__ALP_PLATFORM_API__ || '';

  let score = 0;
  let brokenCount = 0;
  let highScore = Number(localStorage.getItem(STORAGE_KEY)) || 0;
  let maxHp = 8;
  let hp = maxHp;
  let combo = 0;
  let comboTimer = null;
  let breaking = false;

  // 코인 관련
  let totalCoins = 0;       // 서버에서 받아온 현재 보유 코인
  let pendingCoins = 0;     // 아직 서버에 저장 안 된 코인
  let isLoggedIn = false;

  // 로그인 상태 확인 및 현재 코인 조회
  if (alpToken && platformApi) {
    fetch(`${platformApi}/api/auth/me`, {
      headers: { Authorization: `Bearer ${alpToken}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) {
          isLoggedIn = true;
          totalCoins = data.user.coins ?? 0;
          updateCoinDisplay();
        }
      })
      .catch(() => {});
  }

  function updateCoinDisplay() {
    if (!coinCountEl) return;
    if (!isLoggedIn) {
      coinCountEl.textContent = '로그인 필요';
      return;
    }
    const display = totalCoins + pendingCoins;
    coinCountEl.textContent = display.toLocaleString();
  }

  // 5초마다 서버에 코인 저장
  setInterval(() => {
    if (!isLoggedIn || pendingCoins <= 0 || !alpToken || !platformApi) return;
    const amount = pendingCoins;
    pendingCoins = 0;
    fetch(`${platformApi}/api/coins/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alpToken}`,
      },
      body: JSON.stringify({ amount }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.coins !== undefined) {
          totalCoins = data.coins;
          updateCoinDisplay();
        }
      })
      .catch(() => {
        // 실패하면 pendingCoins에 다시 추가
        pendingCoins += amount;
      });
  }, COIN_SAVE_INTERVAL);

  highScoreEl.textContent = String(highScore);

  function persistHigh() {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(STORAGE_KEY, String(highScore));
      highScoreEl.textContent = String(highScore);
    }
  }

  function updateHpBar() {
    const ratio = Math.max(0, hp / maxHp);
    hpFill.style.transform = `scaleX(${ratio})`;
  }

  function setCrackIntensity(intensity) {
    const t = Math.min(1, Math.max(0, intensity));
    crackLayer.innerHTML = "";
    if (t < 0.05) return;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const cx = 50;
    const cy = 48;
    const branches = Math.floor(2 + t * 5);
    for (let i = 0; i < branches; i++) {
      const angle = (i / branches) * Math.PI * 2 + t * 0.8;
      const len = 18 + t * 28 + Math.random() * 8;
      const x2 = cx + Math.cos(angle) * len * 0.35;
      const y2 = cy + Math.sin(angle) * len * 0.35;
      const x3 = cx + Math.cos(angle) * len;
      const y3 = cy + Math.sin(angle) * len;

      const path = document.createElementNS(ns, "path");
      path.setAttribute(
        "d",
        `M ${cx} ${cy} L ${x2} ${y2} L ${x3} ${y3}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(30,30,30," + (0.25 + t * 0.45) + ")");
      path.setAttribute("stroke-width", (0.6 + t * 1.2).toFixed(2));
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);
    }
    crackLayer.appendChild(svg);
  }

  function bumpCombo() {
    combo += 1;
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      combo = 0;
      comboEl.classList.add("hidden");
    }, 1200);
    comboEl.textContent = `콤보 ×${combo}`;
    comboEl.classList.remove("hidden");
  }

  function spawnFloatText(x, y, text) {
    const el = document.createElement("div");
    el.className = "float-score";
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  function spawnParticles(x, y, count) {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const dx = (Math.random() - 0.5) * 140;
      const dy = (Math.random() - 0.5) * 140 - 40;
      p.style.setProperty("--dx", `${dx}px`);
      p.style.setProperty("--dy", `${dy}px`);
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      document.body.appendChild(p);
      p.addEventListener("animationend", () => p.remove());
    }
  }

  function nextRockDifficulty() {
    brokenCount += 1;
    brokenEl.textContent = String(brokenCount);
    maxHp = Math.min(40, 8 + Math.floor(brokenCount * 1.2));
    hp = maxHp;
    updateHpBar();
    setCrackIntensity(0);
  }

  function finishBreak(clientX, clientY) {
    breaking = true;
    rock.disabled = true;
    rock.classList.add("breaking");

    const bonus = 25 + maxHp * 2 + combo * 3;
    score += bonus;
    scoreEl.textContent = String(score);
    persistHigh();

    // 돌 파괴 시 코인 획득 (보너스의 10%, 최소 5코인)
    const coinsEarned = Math.max(5, Math.floor(bonus * 0.1));
    if (isLoggedIn) {
      pendingCoins += coinsEarned;
      updateCoinDisplay();
    }

    const x = clientX ?? stage.getBoundingClientRect().left + stage.offsetWidth / 2;
    const y = clientY ?? stage.getBoundingClientRect().top + stage.offsetHeight / 2;
    spawnFloatText(x, y, `+${bonus} 파괴!`);
    spawnParticles(x, y, 14);

    setTimeout(() => {
      rock.classList.remove("breaking");
      nextRockDifficulty();
      rock.disabled = false;
      breaking = false;
    }, 480);
  }

  function clientPoint(ev) {
    if (ev.changedTouches && ev.changedTouches[0]) {
      const t = ev.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    return { x: ev.clientX, y: ev.clientY };
  }

  let lastHitFromPointer = false;

  function hitRock(ev) {
    if (breaking) return;
    if (ev.pointerType === "mouse" && ev.button !== 0) return;

    bumpCombo();
    const mult = 1 + Math.min(5, combo) * 0.08;
    const base = Math.max(1, Math.round(2 * mult));
    score += base;
    scoreEl.textContent = String(score);
    persistHigh();

    hp -= 1;
    updateHpBar();
    setCrackIntensity(1 - hp / maxHp);

    rock.style.transform = `translate(${(Math.random() - 0.5) * 6}px, ${(Math.random() - 0.5) * 4}px) scale(0.97)`;
    requestAnimationFrame(() => {
      rock.style.transform = "";
    });

    const { x, y } = clientPoint(ev);
    spawnFloatText(x, y, `+${base}`);

    if (hp <= 0) {
      finishBreak(x, y);
    }
  }

  rock.addEventListener(
    "pointerdown",
    (ev) => {
      if (!ev.isPrimary) return;
      lastHitFromPointer = true;
      hitRock(ev);
    },
    { passive: true }
  );

  rock.addEventListener("click", (ev) => {
    if (lastHitFromPointer) {
      lastHitFromPointer = false;
      return;
    }
    hitRock(ev);
  });

  updateHpBar();
  setCrackIntensity(0);
})();

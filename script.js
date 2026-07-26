const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let ambientAudio = new Audio();
ambientAudio.loop = true;
ambientAudio.volume = 1.0;

let ambientEnabled = false;

//Realms Data
const REALMS = [
  {
    id: "tavern",
    label: "Tavern",
    icon: "🍺",
    ambientSound: "Tavern Chatter",
    difficulty: "Peaceful",
    color: "#ff8c42",
  },
  {
    id: "dungeon",
    label: "Dungeon",
    icon: "🏰 ",
    ambientSound: "Dungeon Echoes",
    difficulty: "Dangerous",
  },
  {
    id: "forest",
    label: "Forest",
    icon: "🌲",
    ambientSound: "Forest Whispers",
    difficulty: "Treacherous",
  },
];

//Soundboard Data
const SOUNDS = [
  {
    id: "swordClash",
    label: "Sword Clash",
    icon: "ra-crossed-swords",
    play: playSwordClash,
    color: "#c0c6cf",
  },
  {
    id: "fireball",
    label: "Fireball",
    icon: "ra-burning-meteor",
    play: playFireball,
    color: "#ff8c42",
  },
  {
    id: "dragonRoar",
    label: "Dragon Roar",
    icon: "ra-dragon",
    play: playDragonRoar,
    color: "#6ecf68",
  },
  {
    id: "bats",
    label: "Bats",
    icon: "ra-batwings",
    play: playBats,
    color: "#8d88a8",
  },
  {
    id: "chains",
    label: "Chains",
    icon: "ra-chain",
    play: playChains,
    color: "#a8b0bc",
  },
  {
    id: "doorCreak",
    label: "Door Creak",
    icon: "ra-metal-gate",
    play: playDoorCreak,
    color: "#9c6a3d",
  },
  {
    id: "lightning",
    label: "Lightning",
    icon: "ra-lightning-bolt",
    play: playLightning,
    color: "#ffd447",
  },
  {
    id: "skeleton",
    label: "Skeleton",
    icon: "ra-monster-skull",
    play: playSkeleton,
    color: "#e8e4d8",
  },
  {
    id: "footSteps",
    label: "Footsteps",
    icon: "ra-shoe-prints",
    play: playFootsteps,
    color: "#b58a64",
  },
];

//Dice Data
const DICE = [4, 6, 8, 10, 12, 20];
let selectedDice = 20;
let recentRolls = [];
const MAX_RECENT_ROLLS = 5;

// 9 distinct sounds defined by frequency (Hz)
const frequencies = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33,
];

//Ambience Audio
function playAmbient(src) {
  ambientAudio.pause();

  ambientAudio.src = src;
  ambientAudio.currentTime = 0;

  ambientAudio.play().catch((err) => {
    console.log("Ambient playback blocked:", err);
  });
}

function getAmbientFile(realmId) {
  switch (realmId) {
    case "dungeon":
      return "audio/dungeon.mp3";

    case "tavern":
      return "audio/tavern.mp3";

    case "forest":
      return "audio/forest.mp3";

    default:
      return "";
  }
}

function toggleAmbient() {
  const btn = document.getElementById("ambientToggle");

  if (!ambientEnabled) {
    ambientAudio.src = getAmbientFile(document.body.dataset.realm);
    ambientAudio.currentTime = 0;
    ambientAudio.play();

    ambientEnabled = true;
    btn.classList.add("active");
  } else {
    ambientAudio.pause();
    ambientAudio.currentTime = 0;

    ambientEnabled = false;
    btn.classList.remove("active");
  }
}

//Realm switching
function setRealm(realmId) {
  const app = document.getElementById("app");

  document.body.dataset.realm = realmId;
  app.style.opacity = "0.9";

  setTimeout(() => {
    document.body.dataset.realm = realmId;
    app.style.opacity = "1";
  }, 100);

  //update which realm-option button shows as active
  document.querySelectorAll(".realm-option").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.realmId === realmId);
  });

  //update environment panel's text to match new reamlm
  const realm = REALMS.find((r) => r.id === realmId);
  if (realm) {
    document.getElementById("envRealmValue").textContent =
      `${realm.icon} ${realm.label}`;
    document.getElementById("envAmbientValue").textContent = realm.ambientSound;
    document.getElementById("envDifficultyValue").textContent =
      realm.difficulty;
    // If ambient is currently ON, switch to the new realm's ambience
    if (ambientEnabled) {
      ambientAudio.pause();
      ambientAudio.src = getAmbientFile(realmId);
      ambientAudio.currentTime = 0;
      ambientAudio.play();
    }
  }
}

function renderRealmList() {
  const container = document.getElementById("realmList");

  REALMS.forEach((realm) => {
    const btn = document.createElement("button");
    btn.className = "realm-option";
    btn.dataset.realmId = realm.id;
    btn.innerHTML = `
      <span class= "realm-icon">${realm.icon}</span>
      <span class= "realm-label">${realm.label.toUpperCase()}</span>
      <span class= "realm-arrow">◄</span>
    `;
    btn.addEventListener("click", () => setRealm(realm.id));
    container.appendChild(btn);
  });

  //sync the active button
  setRealm(document.body.dataset.realm || "dungeon");
}

renderRealmList();

document
  .getElementById("ambientToggle")
  .addEventListener("click", toggleAmbient);

//Soundboard
function createNoiseBuffer(duration = 1) {
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function makeDistortionCurve(amount = 50) {
  const n = 44100;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] =
      ((3 + amount) * x * 20 * Math.PI) /
      180 /
      (Math.PI + amount + Math.abs(x));
  }
  return curve;
}

// --- Sword Clash: filtered noise burst (clang) + a short metallic ring tone
function playSwordClash() {
  const t0 = audioCtx.currentTime;

  const noise = audioCtx.createBufferSource();
  noise.buffer = createNoiseBuffer(0.3);
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 3000;
  bandpass.Q.value = 8;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.5, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  noise.connect(bandpass).connect(noiseGain).connect(audioCtx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.3);

  const ring = audioCtx.createOscillator();
  ring.type = "triangle";
  ring.frequency.value = 1800;
  const ringGain = audioCtx.createGain();
  ringGain.gain.setValueAtTime(0.15, t0);
  ringGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
  ring.connect(ringGain).connect(audioCtx.destination);
  ring.start(t0);
  ring.stop(t0 + 0.3);
}

// --- Fireball: noise sweeping through an opening lowpass filter (whoosh)
function playFireball() {
  const t0 = audioCtx.currentTime;

  const noise = audioCtx.createBufferSource();
  noise.buffer = createNoiseBuffer(0.6);
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.setValueAtTime(200, t0);
  lowpass.frequency.exponentialRampToValueAtTime(4000, t0 + 0.4);
  lowpass.frequency.exponentialRampToValueAtTime(300, t0 + 0.6);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.4, t0);
  gain.gain.linearRampToValueAtTime(0.001, t0 + 0.6);
  noise.connect(lowpass).connect(gain).connect(audioCtx.destination);
  noise.start(t0);
  noise.stop(t0 + 0.6);
}

// --- Dragon Roar: descending sawtooth + waveshaper distortion (growl)
function playDragonRoar() {
  const t0 = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, t0);
  osc.frequency.exponentialRampToValueAtTime(60, t0 + 0.8);

  const shaper = audioCtx.createWaveShaper();
  shaper.curve = makeDistortionCurve(80);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.35, t0 + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.9);

  osc.connect(shaper).connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.9);
}

// --- Bats: several randomized high-pitched chirps in quick succession
function playBats() {
  for (let i = 0; i < 6; i++) {
    const t = audioCtx.currentTime + i * 0.07 + Math.random() * 0.03;
    const freq = 1800 + Math.random() * 1200;

    const osc = audioCtx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.05);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.07);
  }
}

// --- Chains: several resonant-filtered noise clinks, staggered
function playChains() {
  for (let i = 0; i < 4; i++) {
    const t = audioCtx.currentTime + i * 0.15;

    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.15);
    const bandpass = audioCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 2000 + Math.random() * 1000;
    bandpass.Q.value = 15;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(bandpass).connect(gain).connect(audioCtx.destination);
    noise.start(t);
    noise.stop(t + 0.15);
  }
}

// --- Door Creak: slow, wobbling frequency sweep (classic creak wobble)
function playDoorCreak() {
  const t0 = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();

  const real = new Float32Array([
    0, 1.0, 0.35, 0.75, 0.18, 0.42, 0.1, 0.28, 0.05,
  ]);
  const imag = new Float32Array([
    0, 0, 0.25, 0.12, 0.18, 0.06, 0.1, 0.04, 0.02,
  ]);

  const doorWave = audioCtx.createPeriodicWave(real, imag);
  osc.setPeriodicWave(doorWave);
  //osc.type = "square";
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.linearRampToValueAtTime(220, t0 + 0.3);
  osc.frequency.linearRampToValueAtTime(160, t0 + 0.6);
  osc.frequency.linearRampToValueAtTime(200, t0 + 0.9);
  osc.frequency.linearRampToValueAtTime(150, t0 + 1.2);

  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 800;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.001, t0);
  gain.gain.linearRampToValueAtTime(0.2, t0 + 0.15);
  gain.gain.linearRampToValueAtTime(0.15, t0 + 1.0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.3);

  osc.connect(lowpass).connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 1.3);
}

// --- Lightning: sharp crack + long filtered rumble tail
function playLightning() {
  const t0 = audioCtx.currentTime;

  const crack = audioCtx.createBufferSource();
  crack.buffer = createNoiseBuffer(0.1);
  const crackGain = audioCtx.createGain();
  crackGain.gain.setValueAtTime(0.6, t0);
  crackGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
  crack.connect(crackGain).connect(audioCtx.destination);
  crack.start(t0);
  crack.stop(t0 + 0.1);

  const rumble = audioCtx.createBufferSource();
  rumble.buffer = createNoiseBuffer(1.2);
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 250;
  const rumbleGain = audioCtx.createGain();
  rumbleGain.gain.setValueAtTime(0.001, t0 + 0.05);
  rumbleGain.gain.linearRampToValueAtTime(0.3, t0 + 0.15);
  rumbleGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.2);
  rumble.connect(lowpass).connect(rumbleGain).connect(audioCtx.destination);
  rumble.start(t0 + 0.05);
  rumble.stop(t0 + 1.2);
}

// --- Skeleton: short rattling sequence of xylophone-like clicks
function playSkeleton() {
  const notes = [800, 950, 700, 1050, 850];
  notes.forEach((freq, i) => {
    const t = audioCtx.currentTime + i * 0.09;
    const osc = audioCtx.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  });
}

// --- Footsteps: two soft low-frequency thuds
function playFootsteps() {
  for (let i = 0; i < 2; i++) {
    const t = audioCtx.currentTime + i * 0.35;
    const noise = audioCtx.createBufferSource();
    noise.buffer = createNoiseBuffer(0.2);
    const lowpass = audioCtx.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 500;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    noise.connect(lowpass).connect(gain).connect(audioCtx.destination);
    noise.start(t);
    noise.stop(t + 0.2);
  }
}

function renderSoundBoard() {
  const grid = document.getElementById("soundGrid");

  SOUNDS.forEach((sounds) => {
    const btn = document.createElement("button");
    btn.className = "sound-btn";
    btn.innerHTML = `
    <i class="ra ${sounds.icon} sound-icon" style="color:${sounds.color || "var(--color-primary)"}"></i>
    <span class="sound-label">${sounds.label}</span>
    `;
    btn.addEventListener("click", () => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      sounds.play();
    });
    grid.appendChild(btn);
  });
}

renderSoundBoard();

//Dice Roller
function selectDice(sides) {
  selectedDice = sides;

  document.querySelectorAll(".dice-btn").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.sides) === sides);
  });

  document.getElementById("rollBtn").textContent = `🎲 ROLL D${sides}`;

  //reset result display
  const resultEl = document.getElementById("diceResult");
  resultEl.textContent = "- awaiting roll -";
  resultEl.classList.add("dice-result");
}

function rollDice() {
  const resultEl = document.getElementById("diceResult");
  const rollBtn = document.getElementById("rollBtn");

  rollBtn.disabled = true;
  rollBtn.textContent = `⟳ ROLLING...`;
  resultEl.className = "dice-result";

  let ticks = 0;
  const maxTicks = 15;
  const interval = setInterval(() => {
    const flickerValue = Math.ceil(Math.random() * selectedDice);
    resultEl.innerHTML = `<span class="dice-result-number">${flickerValue}</span>`;
    ticks++;
    if (ticks >= maxTicks) {
      clearInterval(interval);
      const finalValue = Math.ceil(Math.random() * selectedDice);
      showRollResult(finalValue);
      addRecentRoll(selectedDice, finalValue);

      // Unlock the button and restore its label
      rollBtn.disabled = false;
      rollBtn.textContent = `🎲 ROLL D${selectedDice}`;
    }
  }, 40);
}

function showRollResult(value) {
  const resultEl = document.getElementById("diceResult");
  const isCrit = selectedDice === 20 && value === 20;
  const isFail = selectedDice === 20 && value === 1;

  resultEl.className =
    "dice-result" +
    (isCrit ? " dice-result--crit" : "") +
    (isFail ? " dice-result--fail" : "");

  let messageHTML = "";
  if (isCrit)
    messageHTML = `<span class="dice-crit-message dice-crit-message--hit">★ CRITICAL HIT! ★</span>`;
  if (isFail)
    messageHTML = `<span class="dice-crit-message dice-crit-message--fail">✗ CRITICAL FAIL</span>`;

  resultEl.innerHTML = `<span class="dice-result-number">${value}</span>${messageHTML}`;
}

function addRecentRoll(sides, value) {
  recentRolls.unshift({ sides, value });
  if (recentRolls.length > MAX_RECENT_ROLLS) recentRolls.pop();
  renderRecentRolls();
}

function renderRecentRolls() {
  const label = document.getElementById("recentRollsLabel");
  const container = document.getElementById("recentRolls");
  container.innerHTML = "";

  label.classList.toggle("hidden", recentRolls.length === 0);

  recentRolls.forEach((roll, index) => {
    const isCrit = roll.sides === 20 && roll.value === 20;
    const isFail = roll.sides === 20 && roll.value === 1;

    const chip = document.createElement("span");
    chip.className =
      "recent-roll" +
      (index === 0 ? " recent-roll--latest" : "") +
      (isCrit ? " recent-roll--crit" : "") +
      (isFail ? " recent-roll--fail" : "");
    chip.textContent = `d${roll.sides}:${roll.value}`;
    container.appendChild(chip);
  });
}

function renderDiceRoller() {
  const grid = document.getElementById("diceGrid");

  DICE.forEach((sides) => {
    const btn = document.createElement("button");
    btn.className = "dice-btn";
    btn.textContent = `d${sides}`;
    btn.dataset.sides = sides;
    btn.addEventListener("click", () => selectDice(sides));
    grid.appendChild(btn);
  });

  selectDice(selectedDice);
  document.getElementById("rollBtn").addEventListener("click", rollDice);
}

renderDiceRoller();

//Quest Journal
const QUEST_STORAGE_KEY = "dragonEchoQuest";

function loadQuests() {
  const saved = localStorage.getItem(QUEST_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load quests:", e);
    }
  }
  return [
    { id: 1, text: "Defeat the Dragon", completed: false },
    { id: 2, text: "Visit the Tavern", completed: true },
    { id: 3, text: "Explore the ruins", completed: false },
    { id: 4, text: "Find the Ancient Map", completed: false },
  ];
}

let QUESTS = loadQuests();
let nextQuestId = QUESTS.length ? Math.max(...QUESTS.map((q) => q.id)) + 1 : 1;

function savedQuests() {
  localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(QUESTS));
}

function addQuest(text) {
  QUESTS.push({ id: nextQuestId++, text, completed: false });
  savedQuests();
  renderQuestList();
}

function toggleQuest(id) {
  const quest = QUESTS.find((q) => q.id === id);
  if (quest) quest.completed = !quest.completed;
  savedQuests();
  renderQuestList();
}

function removeQuest(id) {
  QUESTS = QUESTS.filter((q) => q.id !== id);
  savedQuests();
  renderQuestList();
}

function updateQuestProgress() {
  const total = QUESTS.length;
  const done = QUESTS.filter((q) => q.completed).length;
  document.getElementById("questProgressText").textContent = `${done}/${total}`;
  const pct = total === 0 ? 0 : (done / total) * 100;
  document.getElementById("questProgressFill").style.width = `${pct}%`;
}

function renderQuestList() {
  const list = document.getElementById("questList");
  list.innerHTML = "";

  QUESTS.forEach((quest) => {
    const row = document.createElement("div");

    row.className = "quest-row" + (quest.completed ? " quest-row--done" : "");
    row.innerHTML = `
      <label class = "quest-check">
      <input type ="checkbox" class="quest-checkbox" data-id="${quest.id}" ${quest.completed ? "checked" : ""}>
      <span class="quest-text">${quest.text}</span>
      </label>
      <button class="quest-remove" data-id="${quest.id}">x</button>
      `;
    list.appendChild(row);
  });

  list.querySelectorAll(".quest-checkbox").forEach((cb) => {
    cb.addEventListener("change", () => toggleQuest(Number(cb.dataset.id)));
  });

  list.querySelectorAll(".quest-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeQuest(Number(btn.dataset.id)));
  });

  updateQuestProgress();
}

function renderQuestAddButton() {
  const container = document.getElementById("questAdd");
  container.innerHTML = `<button class="quest-add-btn" id="questAddBtn">+ ADD NEW QUEST</button>`;

  const btn = document.getElementById("questAddBtn");
  btn.addEventListener("click", renderQuestAddInput);
}

function renderQuestAddInput() {
  let addingQuest = true;
  const container = document.getElementById("questAdd");
  container.innerHTML = `
  <div class="quest-add-row">
  <input type="text" class="quest-add-input" id="questAddInput" placeholder="Type a new quest and press Enter…">
  <button class="quest-add-confirm" id="questAddConfirm">ADD</button>
  <button class="quest-add-cancel" id="questAddCancel">×</button>
  </div>
  `;
  const input = document.getElementById("questAddInput");
  input.focus();

  function submitQuest() {
    if (input.value.trim()) {
      addQuest(input.value.trim());
      renderQuestAddButton();
    }
  }

  document
    .getElementById("questAddConfirm")
    .addEventListener("click", submitQuest);
  document
    .getElementById("questAddCancel")
    .addEventListener("click", renderQuestAddButton);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitQuest();
    else if (e.key === "Escape") renderQuestAddButton();
  });
}

function initQuestJournal() {
  renderQuestList();
  renderQuestAddButton();
}

initQuestJournal();

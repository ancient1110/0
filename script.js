const factors = {
  shape: ['round', 'rod'],
  grouping: ['single', 'chain'],
  coreColor: ['cyan', 'magenta'],
  speed: ['slow', 'fast'],
  glow: ['low', 'high'],
  grain: ['smooth', 'grainy']
};

const CARD_WIDTH = 64;
const CARD_HEIGHT = 56;

const state = {
  round: 1,
  score: 0,
  streak: 0,
  level: 'normal',
  samples: [],
  selectedId: null,
  motions: new Map(),
  rafId: null
};

const roundEl = document.querySelector('#round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const accEl = document.querySelector('#acc');
const logEl = document.querySelector('#log');
const arena = document.querySelector('#arena');
const binRow = document.querySelector('#binRow');
const levelSel = document.querySelector('#levelSel');

function log(msg) {
  logEl.textContent = `${msg}\n${logEl.textContent}`.trim();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function speciesKey(b) {
  return `${b.shape}-${b.grouping}-${b.coreColor}`;
}

function allBins() {
  const out = [];
  for (const shape of factors.shape) {
    for (const grouping of factors.grouping) {
      for (const coreColor of factors.coreColor) {
        out.push({ key: `${shape}-${grouping}-${coreColor}` });
      }
    }
  }
  return out;
}

function createSample(id) {
  const sample = {
    id,
    shape: pick(factors.shape),
    grouping: pick(factors.grouping),
    coreColor: pick(factors.coreColor),
    speed: pick(factors.speed),
    glow: pick(factors.glow),
    grain: pick(factors.grain)
  };
  sample.answer = speciesKey(sample);
  return sample;
}

function clearSelection() {
  state.selectedId = null;
  document.querySelectorAll('.sample.selected').forEach((el) => {
    el.classList.remove('selected');
  });
}

function clearCheckMarks() {
  document.querySelectorAll('.sample').forEach((card) => {
    card.classList.remove('ok', 'bad', 'agitated');
  });
  document.querySelectorAll('.bin').forEach((bin) => {
    bin.classList.remove('warning');
  });
}

function selectCard(card) {
  clearSelection();
  state.selectedId = card.dataset.id;
  card.classList.add('selected');
}

function setMotionForCard(card) {
  const id = card.dataset.id;
  const maxX = Math.max(1, arena.clientWidth - CARD_WIDTH);
  const maxY = Math.max(1, arena.clientHeight - CARD_HEIGHT);
  state.motions.set(id, {
    x: rand(0, maxX),
    y: rand(0, maxY),
    vx: rand(-1.1, 1.1) || 0.8,
    vy: rand(-1.1, 1.1) || -0.7,
    angle: rand(0, 360),
    vr: rand(-1.4, 1.4)
  });
}

function moveCardToBin(card, bin) {
  card.classList.remove('inArena', 'agitated');
  card.style.left = '';
  card.style.top = '';
  card.style.transform = '';
  state.motions.delete(card.dataset.id);
  bin.appendChild(card);
  clearSelection();
}

function releaseCardToArena(card) {
  card.classList.add('inArena');
  card.classList.remove('agitated');
  arena.appendChild(card);
  setMotionForCard(card);
  clearSelection();
}

function renderBins() {
  binRow.innerHTML = '';
  allBins().forEach((b) => {
    const div = document.createElement('div');
    div.className = 'bin';
    div.dataset.bin = b.key;

    div.addEventListener('click', () => {
      if (!state.selectedId) {
        log('请先在主界面点击一个细菌，再点击下方分区。');
        return;
      }
      const card = document.querySelector(`.sample[data-id="${state.selectedId}"]`);
      if (!card) return;
      moveCardToBin(card, div);
    });

    binRow.appendChild(div);
  });
}

function buildBacteriaVisual(sample) {
  const visual = document.createElement('div');
  visual.className = 'bacteriaVisual';

  const body = document.createElement('div');
  body.className = `bacteriaBody ${sample.shape} ${sample.coreColor} ${sample.glow} ${sample.grain}`;
  visual.appendChild(body);

  if (sample.grouping === 'chain') {
    const clone = body.cloneNode(true);
    clone.classList.add('chainMate');
    visual.appendChild(clone);
  }

  if (sample.speed === 'fast') {
    const trail = document.createElement('div');
    trail.className = 'speedTrail';
    visual.appendChild(trail);
  }

  return visual;
}

function buildCard(sample) {
  const card = document.createElement('div');
  card.className = 'sample inArena';
  card.dataset.id = String(sample.id);
  card.dataset.answer = sample.answer;

  card.appendChild(buildBacteriaVisual(sample));

  card.addEventListener('click', () => {
    if (state.selectedId === card.dataset.id) {
      clearSelection();
      return;
    }
    selectCard(card);
  });

  return card;
}

function initMotions() {
  state.motions.clear();
  arena.querySelectorAll('.sample').forEach((card) => {
    setMotionForCard(card);
  });
}

function animateArena() {
  const maxX = Math.max(1, arena.clientWidth - CARD_WIDTH);
  const maxY = Math.max(1, arena.clientHeight - CARD_HEIGHT);

  state.motions.forEach((m, id) => {
    const card = arena.querySelector(`.sample[data-id="${id}"]`);
    if (!card) return;

    m.x += m.vx;
    m.y += m.vy;
    m.angle += m.vr;

    if (m.x <= 0 || m.x >= maxX) {
      m.vx *= -1;
      m.x = Math.min(Math.max(0, m.x), maxX);
    }
    if (m.y <= 0 || m.y >= maxY) {
      m.vy *= -1;
      m.y = Math.min(Math.max(0, m.y), maxY);
    }

    card.style.left = `${m.x}px`;
    card.style.top = `${m.y}px`;
    card.style.transform = `rotate(${m.angle}deg)`;
  });

  state.rafId = requestAnimationFrame(animateArena);
}

function stopAnimation() {
  if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
}

function startAnimation() {
  stopAnimation();
  initMotions();
  animateArena();
}

function renderArena() {
  arena.innerHTML = '';
  state.samples.forEach((sample) => {
    arena.appendChild(buildCard(sample));
  });
  startAnimation();
}

function newLevel() {
  state.level = levelSel.value;
  let total = 12;
  if (state.level === 'easy') total = 8;
  if (state.level === 'hard') total = 16;

  state.samples = [];
  state.selectedId = null;
  for (let i = 1; i <= total; i += 1) {
    state.samples.push(createSample(i));
  }

  renderArena();
  renderBins();
  clearCheckMarks();
  accEl.textContent = '-';
  roundEl.textContent = String(state.round);
  log(`第 ${state.round} 关开始：细菌会自由移动和旋转，请先点选细菌，再投放到下方分区。`);
}

function checkAnswer() {
  clearCheckMarks();
  const cards = document.querySelectorAll('.sample');
  let correct = 0;

  cards.forEach((card) => {
    card.classList.remove('ok', 'bad');
    const parent = card.parentElement;
    const expected = card.dataset.answer;
    const got = parent?.dataset.bin || 'arena';
    const ok = expected === got;
    if (ok) correct += 1;
    card.classList.add(ok ? 'ok' : 'bad');
  });

  document.querySelectorAll('.bin').forEach((bin) => {
    const wrongCards = [...bin.querySelectorAll('.sample.bad')];
    if (wrongCards.length > 0) {
      bin.classList.add('warning');
      wrongCards.forEach((card) => card.classList.add('agitated'));
    }
  });

  const total = cards.length;
  const acc = total ? correct / total : 0;
  accEl.textContent = `${(acc * 100).toFixed(1)}%`;

  if (acc === 1) {
    state.streak += 1;
    state.score += 120;
    log('完美！所有隔离箱都稳定，无异常躁动。');
  } else {
    state.streak = 0;
    state.score += Math.round(acc * 80);
    const warnCount = document.querySelectorAll('.bin.warning').length;
    log(`本关答对 ${correct}/${total}。有 ${warnCount} 个隔离箱发出警告（箱内出现混错物种并躁动）。`);
  }

  state.round += 1;
  roundEl.textContent = String(state.round);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
}

function giveHint() {
  const card = document.querySelector('#arena .sample') || document.querySelector('.sample');
  if (!card) {
    log('没有可提示的样本。先开始新一关吧。');
    return;
  }

  const sample = state.samples.find((x) => String(x.id) === card.dataset.id);
  if (!sample) return;

  log(`提示：样本 ${sample.id} 的“轮廓 + 连接方式 + 主色调”决定它的归类，速度/荧光/颗粒是干扰。`);
}

document.querySelector('#newBtn').addEventListener('click', newLevel);
document.querySelector('#checkBtn').addEventListener('click', checkAnswer);
document.querySelector('#hintBtn').addEventListener('click', giveHint);
arena.addEventListener('click', () => {
  if (!state.selectedId) return;
  const card = document.querySelector(`.sample[data-id="${state.selectedId}"]`);
  if (!card) return;
  const inBin = card.parentElement?.classList.contains('bin');
  if (inBin) {
    releaseCardToArena(card);
    log('已将选中的细菌释放回主区域。');
  }
});
window.addEventListener('beforeunload', stopAnimation);

newLevel();

const factors = {
  shape: ['round', 'rod'],
  grouping: ['single', 'chain'],
  coreColor: ['cyan', 'magenta'],
  grain: ['smooth', 'grainy'],
  glow: ['low', 'high']
};

const interferenceOptions = {
  tintShift: ['tintCool', 'tintWarm'],
  morph: ['morphLean', 'morphWide'],
  size: ['sizeSm', 'sizeLg']
};

const interferenceOrder = ['glow', 'tintShift', 'morph', 'size'];

const interferenceLabels = {
  glow: '荧光强弱',
  tintShift: '微弱色差',
  morph: '微弱形变',
  size: '大小差异'
};

const difficultyConfig = {
  easy: { label: '简单', total: 8, speciesCount: 3, interferenceCount: 1, binExtra: 1 },
  normal: { label: '普通', total: 12, speciesCount: 3, interferenceCount: 2, binExtra: 2 },
  hard: { label: '困难', total: 20, speciesCount: 4, interferenceCount: 3, binExtra: 1 },
  expert: { label: '专家', total: 24, speciesCount: 4, interferenceCount: 4, binExtra: 2 }
};

const CARD_WIDTH = 64;
const CARD_HEIGHT = 56;

const state = {
  score: 0,
  level: 'normal',
  samples: [],
  selectedId: null,
  motions: new Map(),
  rafId: null,
  levelCompleted: false,
  activeInterferences: []
};

const scoreEl = document.querySelector('#score');
const accEl = document.querySelector('#acc');
const arena = document.querySelector('#arena');
const binRow = document.querySelector('#binRow');
const protocolWarnEl = document.querySelector('#protocolWarn');
const currentLevelEl = document.querySelector('#currentLevel');
const perfectBannerEl = document.querySelector('#perfectBanner');

function log(msg) {
  console.info(msg);
}

function checkProtocol() {
  const isFileProtocol = window.location.protocol === 'file:';
  if (protocolWarnEl) protocolWarnEl.hidden = !isFileProtocol;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSome(arr, count) {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function getSelectedCard() {
  if (!state.selectedId) return null;
  return document.querySelector(`.sample[data-id="${state.selectedId}"]`);
}

const allSpecies = [];
for (const shape of factors.shape) {
  for (const grouping of factors.grouping) {
    for (const coreColor of factors.coreColor) {
      for (const grain of factors.grain) {
        allSpecies.push({ shape, grouping, coreColor, grain });
      }
    }
  }
}

function clearSelection() {
  state.selectedId = null;
  document.querySelectorAll('.sample.selected').forEach((el) => el.classList.remove('selected'));
}

function clearCheckMarks() {
  document.querySelectorAll('.sample').forEach((card) => card.classList.remove('bad', 'agitated'));
  document.querySelectorAll('.bin').forEach((bin) => bin.classList.remove('warning'));
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
  card.classList.remove('inArena', 'agitated', 'bad');
  card.style.left = '';
  card.style.top = '';
  card.style.transform = '';
  state.motions.delete(card.dataset.id);
  bin.appendChild(card);
  clearSelection();
  checkRealTimePurity(bin);
}

function releaseCardToArena(card) {
  const prevBin = card.parentElement;
  card.classList.add('inArena');
  card.classList.remove('agitated', 'bad');
  arena.appendChild(card);
  setMotionForCard(card);
  clearSelection();
  if (prevBin && prevBin.classList.contains('bin')) checkRealTimePurity(prevBin);
}

function checkRealTimePurity(bin) {
  const remain = [...bin.querySelectorAll('.sample')];
  if (remain.length === 0) {
    bin.classList.remove('warning');
    return;
  }
  const isPure = remain.every((c) => c.dataset.answer === remain[0].dataset.answer);
  if (isPure) {
    bin.classList.remove('warning');
    remain.forEach((c) => c.classList.remove('agitated', 'bad'));
  }
}

function renderBins(binCount) {
  binRow.innerHTML = '';
  for (let i = 0; i < binCount; i += 1) {
    const div = document.createElement('div');
    div.className = 'bin';
    binRow.appendChild(div);
  }
}

function buildBacteriaVisual(sample) {
  const visual = document.createElement('div');
  visual.className = 'bacteriaVisual';

  const body = document.createElement('div');
  body.className = [
    'bacteriaBody',
    sample.shape,
    sample.coreColor,
    sample.glow,
    sample.grain,
    sample.tintShift,
    sample.morph,
    sample.sizeVariant
  ].join(' ');
  visual.appendChild(body);

  if (sample.grouping === 'chain') {
    const clone = body.cloneNode(true);
    clone.classList.add('chainMate');
    visual.appendChild(clone);
  }

  return visual;
}

function buildCard(sample) {
  const card = document.createElement('div');
  card.className = 'sample inArena';
  card.dataset.id = String(sample.id);
  card.dataset.answer = sample.answer;

  card.appendChild(buildBacteriaVisual(sample));
  card.addEventListener('click', (e) => {
    const parentBin = card.parentElement?.classList.contains('bin') ? card.parentElement : null;
    const selectedCard = getSelectedCard();
    const isDropAction = parentBin
      && selectedCard
      && selectedCard !== card
      && selectedCard.classList.contains('inArena');

    if (isDropAction) {
      e.stopPropagation();
      moveCardToBin(selectedCard, parentBin);
      return;
    }

    e.stopPropagation();
    if (state.selectedId === card.dataset.id) {
      clearSelection();
      return;
    }
    selectCard(card);
  });
  return card;
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

    if (m.x <= 0 || m.x >= maxX) { m.vx *= -1; m.x = Math.min(Math.max(0, m.x), maxX); }
    if (m.y <= 0 || m.y >= maxY) { m.vy *= -1; m.y = Math.min(Math.max(0, m.y), maxY); }

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
  state.motions.clear();
  arena.querySelectorAll('.sample').forEach((card) => setMotionForCard(card));
  animateArena();
}

function applyInterference(baseSample, activeInterferences) {
  const enhanced = {
    ...baseSample,
    glow: 'low',
    tintShift: '',
    morph: '',
    sizeVariant: ''
  };

  activeInterferences.forEach((item) => {
    if (item === 'glow') enhanced.glow = pick(factors.glow);
    if (item === 'tintShift') enhanced.tintShift = pick(interferenceOptions.tintShift);
    if (item === 'morph') enhanced.morph = pick(interferenceOptions.morph);
    if (item === 'size') enhanced.sizeVariant = pick(interferenceOptions.size);
  });

  return enhanced;
}

function refreshSamples() {
  const config = difficultyConfig[state.level];
  state.samples = [];
  state.selectedId = null;
  state.levelCompleted = false;
  perfectBannerEl.hidden = true;
  state.activeInterferences = interferenceOrder.slice(0, config.interferenceCount);

  const shuffledSpecies = [...allSpecies].sort(() => Math.random() - 0.5);
  const chosenSpecies = shuffledSpecies.slice(0, config.speciesCount);

  for (let i = 1; i <= config.total; i += 1) {
    const sp = i <= config.speciesCount ? chosenSpecies[i - 1] : pick(chosenSpecies);
    const baseSample = {
      id: i,
      shape: sp.shape,
      grouping: sp.grouping,
      coreColor: sp.coreColor,
      grain: sp.grain,
      answer: `${sp.shape}-${sp.grouping}-${sp.coreColor}-${sp.grain}`
    };

    state.samples.push(applyInterference(baseSample, state.activeInterferences));
  }

  state.samples.sort(() => Math.random() - 0.5);

  renderBins(config.speciesCount + config.binExtra);
  arena.innerHTML = '';
  state.samples.forEach((sample) => arena.appendChild(buildCard(sample)));
  startAnimation();

  clearCheckMarks();
  accEl.textContent = '-';
  currentLevelEl.textContent = config.label;
  const names = state.activeInterferences.map((k) => interferenceLabels[k]).join(' / ');
  log(`已刷新样本：${config.label}（样本${config.total}/物种${config.speciesCount}/干扰${config.interferenceCount}项：${names}）`);
}

function checkAnswer() {
  clearCheckMarks();
  const cards = [...document.querySelectorAll('.sample')];
  let correctCount = 0;
  let mixedBinsCount = 0;

  const speciesLocations = new Map();
  cards.forEach((card) => {
    const parent = card.parentElement;
    const answer = card.dataset.answer;
    if (!speciesLocations.has(answer)) speciesLocations.set(answer, new Set());

    if (parent && parent.classList.contains('bin')) {
      speciesLocations.get(answer).add(parent);
    } else {
      speciesLocations.get(answer).add('arena');
    }
  });

  document.querySelectorAll('.bin').forEach((bin) => {
    const binCards = [...bin.querySelectorAll('.sample')];
    if (binCards.length === 0) return;
    const isPure = binCards.every((c) => c.dataset.answer === binCards[0].dataset.answer);
    if (!isPure) {
      bin.classList.add('warning');
      binCards.forEach((c) => c.classList.add('bad', 'agitated'));
      mixedBinsCount += 1;
    }
  });

  cards.forEach((card) => {
    const parent = card.parentElement;
    if (parent && parent.classList.contains('bin') && !parent.classList.contains('warning')) {
      const isTogether = speciesLocations.get(card.dataset.answer).size === 1;
      if (isTogether) correctCount += 1;
    }
  });

  const acc = correctCount / cards.length;
  accEl.textContent = `${(acc * 100).toFixed(0)}%`;

  if (acc === 1) {
    if (!state.levelCompleted) {
      state.score += 150;
      state.levelCompleted = true;
    }
    perfectBannerEl.hidden = false;
    log('✅ 全域校验完成！已排除全部隐患，实验舱状态：绝对纯净。');
  } else {
    perfectBannerEl.hidden = true;
    let msg = `当前分类进度 ${(acc * 100).toFixed(0)}%。`;
    msg += mixedBinsCount > 0
      ? `有 ${mixedBinsCount} 个分区发生冲突（已报警抖动）。`
      : '目前分区没有混杂，但还有同类未归并或还在主区域。';
    log(msg);
  }

  scoreEl.textContent = String(state.score);
}

function setDifficulty(level) {
  state.level = level;
  document.querySelectorAll('.diffBtn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.level === level);
  });
  refreshSamples();
}

document.querySelector('#refreshBtn').addEventListener('click', refreshSamples);
document.querySelector('#checkBtn').addEventListener('click', checkAnswer);
document.querySelectorAll('.diffBtn').forEach((btn) => {
  btn.addEventListener('click', () => setDifficulty(btn.dataset.level));
});

binRow.addEventListener('click', (e) => {
  const bin = e.target.closest('.bin');
  if (!bin) return;
  const selectedCard = getSelectedCard();
  if (!selectedCard || !selectedCard.classList.contains('inArena')) return;
  moveCardToBin(selectedCard, bin);
});

arena.addEventListener('click', () => {
  const card = getSelectedCard();
  if (!card) return;
  if (card.parentElement?.classList.contains('bin')) releaseCardToArena(card);
});

window.addEventListener('beforeunload', stopAnimation);

checkProtocol();
refreshSamples();

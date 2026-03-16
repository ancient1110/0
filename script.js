// 重新定义因子：4个决定因子（轮廓、连接方式、色调、颗粒），1个干扰因子（荧光）
const factors = {
  shape: ['round', 'rod'],         // 决定因子1：轮廓
  grouping: ['single', 'chain'],   // 决定因子2：连接方式（自然贴合，无杆）
  coreColor: ['cyan', 'magenta'],  // 决定因子3：主色调
  grain: ['smooth', 'grainy'],     // 决定因子4：表面颗粒
  glow: ['low', 'high']            // 干扰因子：荧光
};

const CARD_WIDTH = 64;
const CARD_HEIGHT = 56;

const state = {
  round: 0,
  score: 0,
  streak: 0,
  level: 'normal',
  samples:[],
  selectedId: null,
  motions: new Map(),
  rafId: null,
  levelCompleted: false
};

const roundEl = document.querySelector('#round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const accEl = document.querySelector('#acc');
const logEl = document.querySelector('#log');
const arena = document.querySelector('#arena');
const binRow = document.querySelector('#binRow');
const levelSel = document.querySelector('#levelSel');
const protocolWarnEl = document.querySelector('#protocolWarn');

function log(msg) {
  logEl.textContent = `${msg}\n${logEl.textContent}`.trim();
}

function checkProtocol() {
  const isFileProtocol = window.location.protocol === 'file:';
  if (protocolWarnEl) {
    protocolWarnEl.hidden = !isFileProtocol;
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// 提前穷举出16种可能的组合池
const allSpecies =[];
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
  document.querySelectorAll('.sample.selected').forEach((el) => {
    el.classList.remove('selected');
  });
}

function clearCheckMarks() {
  // 彻底去除了外面的对错圈圈，只保留抖动样式
  document.querySelectorAll('.sample').forEach((card) => {
    card.classList.remove('bad', 'agitated'); 
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
  card.classList.remove('inArena', 'agitated', 'bad');
  card.style.left = '';
  card.style.top = '';
  card.style.transform = '';
  state.motions.delete(card.dataset.id);
  bin.appendChild(card);
  clearSelection();
  
  // 移入新箱子时，如果原先的箱子不再纯净，解除旧警报（重新判定交给检查按钮）
  checkRealTimePurity(bin);
}

// 超强优质体验：拿出细菌的瞬间，立刻检查原箱子是否纯净。如果纯净了，马上解除警报！
function releaseCardToArena(card) {
  const prevBin = card.parentElement;
  
  card.classList.add('inArena');
  card.classList.remove('agitated', 'bad');
  arena.appendChild(card);
  setMotionForCard(card);
  clearSelection();

  if (prevBin && prevBin.classList.contains('bin')) {
    checkRealTimePurity(prevBin);
  }
}

// 实时纯净度检查：仅用于取消警报
function checkRealTimePurity(bin) {
  const remain = [...bin.querySelectorAll('.sample')];
  if (remain.length === 0) {
    bin.classList.remove('warning');
  } else {
    const isPure = remain.every(c => c.dataset.answer === remain[0].dataset.answer);
    if (isPure) {
      bin.classList.remove('warning');
      remain.forEach(c => c.classList.remove('agitated', 'bad'));
    }
  }
}

function renderBins() {
  binRow.innerHTML = '';
  // 不再绑定固定标签，直接生成 12 个通用空箱子，玩家可以随便把细菌聚类进任意空箱子
  for (let i = 0; i < 12; i++) {
    const div = document.createElement('div');
    div.className = 'bin';
    div.addEventListener('click', () => {
      if (!state.selectedId) return;
      const card = document.querySelector(`.sample[data-id="${state.selectedId}"]`);
      if (!card) return;
      moveCardToBin(card, div);
    });
    binRow.appendChild(div);
  }
}

function buildBacteriaVisual(sample) {
  const visual = document.createElement('div');
  visual.className = 'bacteriaVisual';

  const body = document.createElement('div');
  body.className = `bacteriaBody ${sample.shape} ${sample.coreColor} ${sample.glow} ${sample.grain}`;
  visual.appendChild(body);

  // 链状：没有奇怪的杆了！第二个细胞利用 CSS 自然贴合重叠
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
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
}

function startAnimation() {
  stopAnimation();
  state.motions.clear();
  arena.querySelectorAll('.sample').forEach((card) => setMotionForCard(card));
  animateArena();
}

function newLevel() {
  state.level = levelSel.value;
  let total = 12;
  let speciesCount = 4; // 控制出现的物种数，保证有相同的细菌用来聚类
  if (state.level === 'easy') { total = 8; speciesCount = 3; }
  if (state.level === 'hard') { total = 16; speciesCount = 6; }

  state.samples =[];
  state.selectedId = null;
  state.levelCompleted = false; 
  state.round += 1;

  // 随机抽取本局要出现的物种
  const shuffledSpecies = [...allSpecies].sort(() => Math.random() - 0.5);
  const chosenSpecies = shuffledSpecies.slice(0, speciesCount);

  for (let i = 1; i <= total; i += 1) {
    // 前面几个强制每种出一个，后面随机，保证必定有可以聚类的对象
    const sp = i <= speciesCount ? chosenSpecies[i - 1] : pick(chosenSpecies);
    
    state.samples.push({
      id: i,
      shape: sp.shape,
      grouping: sp.grouping,
      coreColor: sp.coreColor,
      grain: sp.grain,
      glow: pick(factors.glow), // 唯一的随机干扰因子
      answer: `${sp.shape}-${sp.grouping}-${sp.coreColor}-${sp.grain}`
    });
  }

  // 乱序
  state.samples.sort(() => Math.random() - 0.5);

  renderBins();
  arena.innerHTML = '';
  state.samples.forEach(sample => arena.appendChild(buildCard(sample)));
  startAnimation();
  
  clearCheckMarks();
  accEl.textContent = '-';
  roundEl.textContent = String(state.round);
  log(`第 ${state.round} 关开始：已混入多种细菌。找出长得一样的同族，分别聚类到任意的空箱子里！`);
}

function checkAnswer() {
  clearCheckMarks();
  const cards = [...document.querySelectorAll('.sample')];
  let correctCount = 0;
  let mixedBinsCount = 0;

  // 统计每个物种目前分散在哪些地方
  const speciesLocations = new Map();
  cards.forEach(card => {
    const parent = card.parentElement;
    const answer = card.dataset.answer;
    if (!speciesLocations.has(answer)) speciesLocations.set(answer, new Set());
    
    if (parent && parent.classList.contains('bin')) {
      speciesLocations.get(answer).add(parent);
    } else {
      speciesLocations.get(answer).add('arena');
    }
  });

  // 核心修复 1：只有混错了的箱子才会报警！只有一个细菌的箱子不再误报。
  document.querySelectorAll('.bin').forEach((bin) => {
    const binCards = [...bin.querySelectorAll('.sample')];
    if (binCards.length === 0) return;

    const isPure = binCards.every(c => c.dataset.answer === binCards[0].dataset.answer);
    if (!isPure) {
      bin.classList.add('warning'); // 出现杂种，报警！
      binCards.forEach(c => c.classList.add('bad', 'agitated'));
      mixedBinsCount++;
    }
  });

  // 计算正确率（呆在纯净的箱子里，且同类没有被分散在其他地方）
  cards.forEach(card => {
    const parent = card.parentElement;
    if (parent && parent.classList.contains('bin') && !parent.classList.contains('warning')) {
      const isTogether = speciesLocations.get(card.dataset.answer).size === 1;
      if (isTogether) correctCount++;
    }
  });

  const acc = correctCount / cards.length;
  accEl.textContent = `${(acc * 100).toFixed(0)}%`;

  if (acc === 1) {
    if (!state.levelCompleted) {
      state.streak += 1;
      state.score += 120 + (state.streak * 10);
      state.levelCompleted = true;
    }
    log('🎉 完美！所有同类细菌都已正确分组，没有漏网之鱼，也没有混杂。请点击“新一关”！');
  } else {
    state.streak = 0;
    let msg = `当前分类进度 ${(acc * 100).toFixed(0)}%。`;
    if (mixedBinsCount > 0) {
      msg += `有 ${mixedBinsCount} 个箱子发生冲突（已报警抖动）！`;
      msg += `💡 只要把箱子里错误的细菌点出来放回上方，警报就会瞬间解除！`;
    } else {
      msg += `目前箱子都很纯净，但还有同类没被放在一起，或者还在主区域里。`;
    }
    log(msg);
  }

  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
}

function giveHint() {
  let card = state.selectedId ? document.querySelector(`.sample[data-id="${state.selectedId}"]`) : document.querySelector('.sample');
  if (!card) return;

  const sample = state.samples.find((x) => String(x.id) === card.dataset.id);
  if (!sample) return;

  const dict = {
    'round': '圆形', 'rod': '杆状',
    'single': '单体', 'chain': '链状',
    'smooth': '表面光滑', 'grainy': '表面带颗粒',
    'cyan': '青色', 'magenta': '粉色'
  };

  log(`💡提示：当前关注的细菌是【${dict[sample.shape]}】+【${dict[sample.grouping]}】+【${dict[sample.grain]}】+【${dict[sample.coreColor]}】。
请将这 4 个特征完全一致的放在一起。“发光亮度”是唯一的干扰项！`);
}

document.querySelector('#newBtn').addEventListener('click', newLevel);
document.querySelector('#checkBtn').addEventListener('click', checkAnswer);
document.querySelector('#hintBtn').addEventListener('click', giveHint);
arena.addEventListener('click', () => {
  if (!state.selectedId) return;
  const card = document.querySelector(`.sample[data-id="${state.selectedId}"]`);
  if (!card) return;
  if (card.parentElement?.classList.contains('bin')) {
    releaseCardToArena(card);
  }
});
window.addEventListener('beforeunload', stopAnimation);

checkProtocol();
newLevel();
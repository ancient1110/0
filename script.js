const factors = {
  color: ['红', '绿', '黄'],
  size: ['大', '小'],
  texture: ['光滑', '斑点']
};

const emojis = {
  红: '🍎',
  绿: '🥝',
  黄: '🍋'
};

const state = {
  round: 1,
  score: 0,
  streak: 0,
  level: 'normal',
  fruits: []
};

const roundEl = document.querySelector('#round');
const scoreEl = document.querySelector('#score');
const streakEl = document.querySelector('#streak');
const accEl = document.querySelector('#acc');
const logEl = document.querySelector('#log');
const binRow = document.querySelector('#binRow');
const pool = document.querySelector('#pool');
const levelSel = document.querySelector('#levelSel');

function log(msg) {
  logEl.textContent = `${msg}\n${logEl.textContent}`.trim();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function makeKey(f) {
  return `${f.color}-${f.size}-${f.texture}`;
}

function allBins() {
  const out = [];
  for (const color of factors.color) {
    for (const size of factors.size) {
      for (const texture of factors.texture) {
        out.push({ color, size, texture, key: `${color}-${size}-${texture}` });
      }
    }
  }
  return out;
}

function createFruit(id) {
  const fruit = {
    id,
    color: pick(factors.color),
    size: pick(factors.size),
    texture: pick(factors.texture)
  };
  fruit.answer = makeKey(fruit);
  return fruit;
}

function fruitLabel(fruit) {
  return `${emojis[fruit.color]} ${fruit.color}${fruit.size}${fruit.texture}`;
}

function renderBins() {
  binRow.innerHTML = '';
  const bins = allBins();
  bins.forEach((b) => {
    const div = document.createElement('div');
    div.className = 'bin';
    div.dataset.bin = b.key;
    div.innerHTML = `<div class="binTitle">${b.color} + ${b.size} + ${b.texture}</div>`;

    div.addEventListener('dragover', (e) => e.preventDefault());
    div.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      const card = document.querySelector(`[data-id="${id}"]`);
      if (card) div.appendChild(card);
    });

    binRow.appendChild(div);
  });
}

function renderPool() {
  pool.innerHTML = '';
  state.fruits.forEach((fruit) => {
    const card = document.createElement('div');
    card.className = 'fruit';
    card.draggable = true;
    card.dataset.id = String(fruit.id);
    card.dataset.answer = fruit.answer;
    card.textContent = fruitLabel(fruit);

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(fruit.id));
    });

    pool.appendChild(card);
  });
}

function newLevel() {
  state.level = levelSel.value;
  let total = 9;
  if (state.level === 'easy') total = 6;
  if (state.level === 'hard') total = 12;

  state.fruits = [];
  for (let i = 1; i <= total; i++) {
    state.fruits.push(createFruit(i));
  }

  renderBins();
  renderPool();
  accEl.textContent = '-';
  roundEl.textContent = String(state.round);
  log(`第 ${state.round} 关开始：请根据“颜色+大小+纹理”三因子分拣 ${total} 个水果。`);
}

function checkAnswer() {
  const cards = document.querySelectorAll('.fruit');
  let correct = 0;

  cards.forEach((card) => {
    const parent = card.parentElement;
    const expected = card.dataset.answer;
    const got = parent?.dataset.bin || 'pool';
    const ok = expected === got;
    if (ok) correct += 1;
    card.style.borderColor = ok ? '#16a34a' : '#dc2626';
  });

  const total = cards.length;
  const acc = total ? correct / total : 0;
  accEl.textContent = `${(acc * 100).toFixed(1)}%`;

  if (acc === 1) {
    state.streak += 1;
    state.score += 100;
    log('太棒了！全部分对，说明你已经掌握了细粒度特征拆分。');
  } else {
    state.streak = 0;
    state.score += Math.round(acc * 60);
    log(`本关答对 ${correct}/${total}。先看错题：是不是漏看了“大小”或“纹理”？`);
  }

  state.round += 1;
  roundEl.textContent = String(state.round);
  scoreEl.textContent = String(state.score);
  streakEl.textContent = String(state.streak);
}

function giveHint() {
  const card = document.querySelector('#pool .fruit') || document.querySelector('.fruit');
  if (!card) {
    log('没有可提示的水果。先开始新一关吧。');
    return;
  }

  const f = state.fruits.find((x) => String(x.id) === card.dataset.id);
  if (!f) return;
  log(`提示：${fruitLabel(f)} 应进入「${f.color} + ${f.size} + ${f.texture}」这个箱子。`);
}

document.querySelector('#newBtn').addEventListener('click', newLevel);
document.querySelector('#checkBtn').addEventListener('click', checkAnswer);
document.querySelector('#hintBtn').addEventListener('click', giveHint);

newLevel();

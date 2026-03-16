const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const logBox = document.querySelector('#log');

const roundLabel = document.querySelector('#roundLabel');
const inertiaLabel = document.querySelector('#inertiaLabel');
const qualityLabel = document.querySelector('#qualityLabel');
const accuracyLabel = document.querySelector('#accuracyLabel');
const difficultySelect = document.querySelector('#difficulty');

const palette = ['#22d3ee', '#f97316', '#a78bfa', '#34d399', '#f43f5e'];

const state = {
  points: [],
  centroids: [],
  k: 3,
  round: 1,
  assigned: false,
  showTruth: false,
  dragging: null
};

function log(msg) {
  logBox.textContent = `${msg}\n${logBox.textContent}`.trim();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function dist2(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function nearestCentroidIndex(point) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < state.centroids.length; i++) {
    const d = dist2(point, state.centroids[i]);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function makeRound() {
  const mode = difficultySelect.value;
  let config;
  if (mode === 'easy') config = { k: 2, perCluster: 6 };
  else if (mode === 'hard') config = { k: 4, perCluster: 7 };
  else config = { k: 3, perCluster: 6 };

  state.k = config.k;
  state.points = [];
  state.centroids = [];
  state.round = 1;
  state.assigned = false;
  state.dragging = null;

  const trueCenters = [];
  for (let i = 0; i < config.k; i++) {
    trueCenters.push({ x: rand(100, 760), y: rand(90, 430) });
  }

  trueCenters.forEach((center, truth) => {
    for (let i = 0; i < config.perCluster; i++) {
      state.points.push({
        x: center.x + rand(-70, 70),
        y: center.y + rand(-70, 70),
        truth,
        cluster: null
      });
    }
  });

  for (let i = 0; i < config.k; i++) {
    state.centroids.push({ x: rand(80, 780), y: rand(80, 450) });
  }

  inertiaLabel.textContent = '-';
  qualityLabel.textContent = '-';
  accuracyLabel.textContent = '-';
  roundLabel.textContent = String(state.round);
  log(`新一局开始：k=${config.k}，样本=${state.points.length}。先拖动质心，再分配。`);
  draw();
}

function assignPoints() {
  if (!state.centroids.length) return;
  state.points.forEach((p) => {
    p.cluster = nearestCentroidIndex(p);
  });
  state.assigned = true;

  const inertia = calculateInertia();
  const quality = silhouetteLikeScore();
  const accuracy = bestMatchAccuracy();

  inertiaLabel.textContent = inertia.toFixed(1);
  qualityLabel.textContent = quality.toFixed(3);
  accuracyLabel.textContent = `${(accuracy * 100).toFixed(1)}%`;

  log(`第 ${state.round} 轮分配完成：Inertia=${inertia.toFixed(1)}。`);
  draw();
}

function updateCentroids() {
  if (!state.assigned) {
    log('请先执行“分配到最近质心”。');
    return;
  }

  const groups = Array.from({ length: state.k }, () => []);
  state.points.forEach((p) => groups[p.cluster].push(p));

  let moved = 0;
  groups.forEach((g, i) => {
    if (!g.length) return;
    const meanX = g.reduce((s, p) => s + p.x, 0) / g.length;
    const meanY = g.reduce((s, p) => s + p.y, 0) / g.length;
    moved += Math.sqrt(dist2(state.centroids[i], { x: meanX, y: meanY }));
    state.centroids[i].x = meanX;
    state.centroids[i].y = meanY;
  });

  state.round += 1;
  roundLabel.textContent = String(state.round);
  state.assigned = false;

  log(`质心已更新，总移动距离 ${moved.toFixed(2)}。继续“分配→更新”直到收敛。`);
  draw();
}

function calculateInertia() {
  return state.points.reduce((sum, p) => sum + dist2(p, state.centroids[p.cluster]), 0);
}

function silhouetteLikeScore() {
  if (!state.points.length) return 0;
  let total = 0;
  for (const p of state.points) {
    const same = state.points.filter((q) => q !== p && q.cluster === p.cluster);
    const a = same.length
      ? same.reduce((s, q) => s + Math.sqrt(dist2(p, q)), 0) / same.length
      : 0;

    let b = Infinity;
    for (let c = 0; c < state.k; c++) {
      if (c === p.cluster) continue;
      const other = state.points.filter((q) => q.cluster === c);
      if (!other.length) continue;
      const avg = other.reduce((s, q) => s + Math.sqrt(dist2(p, q)), 0) / other.length;
      b = Math.min(b, avg);
    }
    const s = (b - a) / Math.max(a, b || 1);
    total += Number.isFinite(s) ? s : 0;
  }
  return total / state.points.length;
}

function bestMatchAccuracy() {
  const usedTruth = new Set();
  let correct = 0;

  for (let c = 0; c < state.k; c++) {
    const clusterPoints = state.points.filter((p) => p.cluster === c);
    if (!clusterPoints.length) continue;

    const counts = new Map();
    clusterPoints.forEach((p) => counts.set(p.truth, (counts.get(p.truth) || 0) + 1));

    let bestTruth = null;
    let bestCount = -1;
    for (const [truth, count] of counts.entries()) {
      if (usedTruth.has(truth)) continue;
      if (count > bestCount) {
        bestCount = count;
        bestTruth = truth;
      }
    }

    if (bestTruth !== null) {
      usedTruth.add(bestTruth);
      correct += bestCount;
    }
  }

  return correct / state.points.length;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of state.points) {
    const color = p.cluster === null ? '#94a3b8' : palette[p.cluster % palette.length];

    if (state.showTruth) {
      ctx.strokeStyle = palette[p.truth % palette.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  state.centroids.forEach((c, i) => {
    ctx.fillStyle = palette[i % palette.length];
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(c.x, c.y - 10);
    ctx.lineTo(c.x + 10, c.y);
    ctx.lineTo(c.x, c.y + 10);
    ctx.lineTo(c.x - 10, c.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText(`C${i + 1}`, c.x + 12, c.y - 12);
  });
}

function getMousePos(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
  const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

canvas.addEventListener('mousedown', (evt) => {
  const m = getMousePos(evt);
  for (let i = 0; i < state.centroids.length; i++) {
    if (Math.sqrt(dist2(m, state.centroids[i])) < 14) {
      state.dragging = i;
      return;
    }
  }
});

canvas.addEventListener('mousemove', (evt) => {
  if (state.dragging === null) return;
  const m = getMousePos(evt);
  state.centroids[state.dragging].x = Math.max(12, Math.min(canvas.width - 12, m.x));
  state.centroids[state.dragging].y = Math.max(12, Math.min(canvas.height - 12, m.y));
  draw();
});

window.addEventListener('mouseup', () => {
  if (state.dragging !== null) log('已拖动质心位置。可以点击“分配到最近质心”。');
  state.dragging = null;
});

document.querySelector('#newRoundBtn').addEventListener('click', makeRound);
document.querySelector('#assignBtn').addEventListener('click', assignPoints);
document.querySelector('#updateBtn').addEventListener('click', updateCentroids);
document.querySelector('#toggleTruthBtn').addEventListener('click', () => {
  state.showTruth = !state.showTruth;
  draw();
});

makeRound();

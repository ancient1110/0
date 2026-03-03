const materialDb = {
  wood: { name: '木材', h: 15, w: 10, s: 20, wind: 8, cost: 200 },
  steel: { name: '普通钢', h: 25, w: 18, s: 40, wind: 16, cost: 500 },
  concrete: { name: '混凝土', h: 20, w: 20, s: 70, wind: 24, cost: 650 },
  carbon: { name: '碳纤维', h: 22, w: 5, s: 35, wind: 22, cost: 900 },
  titanium: { name: '钛合金', h: 25, w: 6, s: 80, wind: 28, cost: 1000 },
  adhesive: { name: '特种胶复材', h: 18, w: 4, s: 30, wind: 20, cost: 700 },
  alu: { name: '航空铝', h: 20, w: 7, s: 45, wind: 21, cost: 750 },
  bamboo: { name: '竹基复材', h: 16, w: 9, s: 28, wind: 14, cost: 350 },
  basalt: { name: '玄武岩纤维', h: 20, w: 8, s: 50, wind: 24, cost: 820 },
  ceramic: { name: '陶瓷芯材', h: 17, w: 6, s: 38, wind: 19, cost: 680 }
};

const state = {
  phase: 1,
  budget: 10000,
  record: 0,
  ctqDone: false,
  analyzeDone: false,
  sop: false,
  measured: new Set(),
  latestFinalTower: null
};

const battleLog = document.querySelector('#battleLog');
const phase1Slots = document.querySelector('#phase1Slots');
const phase2Slots = document.querySelector('#phase2Slots');
const phaseLabel = document.querySelector('#phaseLabel');
const budgetLabel = document.querySelector('#budgetLabel');
const recordLabel = document.querySelector('#recordLabel');

function log(msg) {
  battleLog.textContent = `${msg}\n${battleLog.textContent}`.trim();
}

function makeSlot(container, id, label, pool) {
  const div = document.createElement('div');
  div.className = 'slot';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  select.id = id;
  pool.forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${materialDb[key].name}（${materialDb[key].cost}金）`;
    select.appendChild(opt);
  });
  div.append(span, select);
  container.appendChild(div);
}

function setupSlots() {
  ['地基', '塔身', '塔顶'].forEach((label, idx) => {
    makeSlot(phase1Slots, `p1-${idx}`, label, ['wood', 'steel', 'concrete']);
  });
  ['地基', '2层', '3层', '4层', '塔顶'].forEach((label, idx) => {
    makeSlot(phase2Slots, `p2-${idx}`, label, Object.keys(materialDb));
  });
  const measureSelect = document.querySelector('#measureSelect');
  Object.keys(materialDb).forEach((k) => {
    const opt = document.createElement('option');
    opt.value = k;
    opt.textContent = materialDb[k].name;
    measureSelect.appendChild(opt);
  });
}

function towerResult(keys, windEnv) {
  const mats = keys.map((k) => materialDb[k]);
  const totalHeight = mats.reduce((a, m) => a + m.h, 0);
  const totalCost = mats.reduce((a, m) => a + m.cost, 0);
  const windRes = mats.reduce((a, m) => a + m.wind, 0);

  for (let i = 0; i < mats.length - 1; i++) {
    const support = mats[i].s;
    const aboveWeight = mats.slice(i + 1).reduce((a, m) => a + m.w, 0);
    if (support < aboveWeight + windEnv) {
      return { ok: false, reason: `${i + 1}层承重不足（${support} < ${aboveWeight + windEnv}）`, totalHeight, totalCost, windRes };
    }
  }

  if (windRes <= windEnv) {
    return { ok: false, reason: `抗风不足（${windRes} <= ${windEnv}）`, totalHeight, totalCost, windRes };
  }

  return { ok: true, reason: '结构稳定', totalHeight, totalCost, windRes };
}

function refreshUi() {
  phaseLabel.textContent = state.phase === 1 ? '第一阶段（PDCA）' : '第二阶段（DMAIC）';
  budgetLabel.textContent = state.budget;
  recordLabel.textContent = state.record;
}

setupSlots();
refreshUi();
log('欢迎来到塔台质控局。先通过 PDCA 快速试错吧。');


document.querySelector('#buildBtn').addEventListener('click', () => {
  const keys = [0, 1, 2].map((i) => document.querySelector(`#p1-${i}`).value);
  const res = towerResult(keys, 10 + Math.floor(Math.random() * 11));
  if (res.ok) {
    state.record = Math.max(state.record, res.totalHeight);
    log(`PDCA成功：高度${res.totalHeight}，成本${res.totalCost}。最高纪录刷新到 ${state.record}。`);
  } else {
    log(`PDCA失败：${res.reason}。高度${res.totalHeight}。`);
  }
  refreshUi();
});

document.querySelector('#unlockPhase2Btn').addEventListener('click', () => {
  state.phase = 2;
  document.querySelector('#phase1Panel').classList.add('hidden');
  document.querySelector('#phase2Panel').classList.remove('hidden');
  log('危机降临：进入第二阶段。每次最终施工扣 500 金币，先用 DMAIC 工具箱。');
  refreshUi();
});

document.querySelector('#ctqBtn').addEventListener('click', () => {
  const input = document.querySelector('#ctqInput').value;
  const normalized = input.replace(/\s/g, '').toLowerCase();
  const ok = normalized.includes('高度>100') && normalized.includes('成本<5000') && normalized.includes('抗风>50');
  if (ok) {
    state.ctqDone = true;
    document.querySelector('#ctqResult').textContent = 'CTQ 提取成功：目标已锁定。';
  } else {
    document.querySelector('#ctqResult').textContent = 'CTQ 不完整，请包含高度>100、成本<5000、抗风>50。';
  }
});

document.querySelector('#measureBtn').addEventListener('click', () => {
  if (state.budget < 50) return log('预算不足，无法鉴定。');
  const k = document.querySelector('#measureSelect').value;
  state.budget -= 50;
  state.measured.add(k);
  const m = materialDb[k];
  const line = `${m.name}: H${m.h}, W${m.w}, S${m.s}, 抗风${m.wind}, 成本${m.cost}`;
  document.querySelector('#measureLog').textContent += `${line}\n`;
  refreshUi();
});

document.querySelector('#analysisData').textContent = [
  '记录1：全普通钢 -> 塌了（承重边界不足）',
  '记录2：底层钛合金+上层木材 -> 不塌，但被风吹断',
  '记录3：全钛合金 -> 稳定，但成本超标'
].join('\n');

document.querySelector('#analyzeBtn').addEventListener('click', () => {
  const selected = document.querySelector('input[name="rootCause"]:checked')?.value;
  if (selected === 'b') {
    state.analyzeDone = true;
    document.querySelector('#analyzeResult').textContent = '分析正确：头轻脚重是关键原则。';
  } else {
    document.querySelector('#analyzeResult').textContent = '分析不正确，请重试。';
  }
});

document.querySelector('#finalBuildBtn').addEventListener('click', () => {
  if (!state.ctqDone || !state.analyzeDone) return log('请先完成 Define 与 Analyze。');
  if (state.budget < 500) return log('预算不足，无法最终施工。');
  state.budget -= 500;

  const keys = [0, 1, 2, 3, 4].map((i) => document.querySelector(`#p2-${i}`).value);
  const res = towerResult(keys, 50);
  const pass = res.ok && res.totalHeight > 100 && res.totalCost < 5000;
  state.latestFinalTower = { keys, ...res, pass };
  if (pass) {
    log(`最终施工成功：高度${res.totalHeight}，抗风${res.windRes}，成本${res.totalCost}。`);
    document.querySelector('#finalBuildResult').textContent = '方案通过约束。进入 Control 验证。';
  } else {
    log(`最终施工失败：${res.reason}；高度${res.totalHeight}，抗风${res.windRes}，成本${res.totalCost}。`);
    document.querySelector('#finalBuildResult').textContent = '方案未通过，请继续优化。';
  }
  refreshUi();
});

document.querySelector('#buySopBtn').addEventListener('click', () => {
  if (state.sop) return;
  if (state.budget < 200) return log('预算不足，无法购买 SOP。');
  state.budget -= 200;
  state.sop = true;
  refreshUi();
  log('已购买 SOP 卡：公差波动缩小。');
});

document.querySelector('#massRunBtn').addEventListener('click', () => {
  if (!state.latestFinalTower?.pass) return log('请先提交一个通过 Improve 的方案。');
  let success = 0;
  const baseWind = state.latestFinalTower.windRes;
  const noise = state.sop ? 2 : 15;
  for (let i = 0; i < 100; i++) {
    const drift = Math.floor(Math.random() * (noise * 2 + 1)) - noise;
    const finalWind = baseWind + drift;
    if (finalWind > 50) success += 1;
  }
  const rate = ((success / 100) * 100).toFixed(0);
  const msg = `批量生产完成：良品 ${success}/100（${rate}%），波动范围 ±${noise}。`;
  document.querySelector('#controlResult').textContent = msg;
  log(msg);
});

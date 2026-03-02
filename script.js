const baseState = {
  budget: 100,
  quality: 55,
  speed: 55,
  risk: 35,
  learning: 0,
  towerHeight: 2,
};

const phases = {
  pdca: [
    {
      title: "Plan｜规划",
      desc: "塔台初建前，你要决定如何规划设计。",
      choices: [
        {
          text: "做需求访谈 + 风险清单（慢但稳）",
          effect: { speed: -8, quality: +12, risk: -10, learning: +8 },
        },
        {
          text: "快速画草图直接开工（快但易返工）",
          effect: { speed: +10, quality: -6, risk: +8, learning: +2 },
        },
      ],
    },
    {
      title: "Do｜执行",
      desc: "施工阶段，资源有限。你怎么分配？",
      choices: [
        {
          text: "投入预算做材料测试",
          effect: { budget: -15, quality: +14, risk: -6, towerHeight: +1, learning: +4 },
        },
        {
          text: "压缩测试换取施工速度",
          effect: { budget: -8, speed: +10, risk: +12, towerHeight: +2 },
        },
      ],
    },
    {
      title: "Check｜检查",
      desc: "发现塔体轻微倾斜，如何验证问题？",
      choices: [
        {
          text: "现场抽检 + 数据复盘",
          effect: { speed: -5, quality: +8, risk: -8, learning: +10 },
        },
        {
          text: "凭经验判断继续施工",
          effect: { speed: +6, quality: -7, risk: +9, learning: -2 },
        },
      ],
    },
    {
      title: "Act｜处理",
      desc: "针对检查结果，你要形成后续动作。",
      choices: [
        {
          text: "标准化新作业指导书并培训",
          effect: { budget: -8, quality: +9, risk: -9, towerHeight: +1, learning: +14 },
        },
        {
          text: "口头提醒，下轮再说",
          effect: { speed: +4, quality: -5, risk: +7, learning: -3 },
        },
      ],
    },
  ],
  dmaic: [
    {
      title: "Define｜定义",
      desc: "塔台交付延期，客户投诉。你先做什么？",
      choices: [
        {
          text: "明确 CTQ 指标（高度、稳定性、工期）",
          effect: { quality: +8, speed: -4, learning: +6 },
        },
        {
          text: "先要求团队加班赶进度",
          effect: { speed: +6, quality: -5, risk: +6 },
        },
      ],
    },
    {
      title: "Measure｜测量",
      desc: "你需要收集哪些数据来确认问题规模？",
      choices: [
        {
          text: "分工序记录缺陷率与返工时长",
          effect: { budget: -10, quality: +10, risk: -6, learning: +8 },
        },
        {
          text: "只统计总工期",
          effect: { speed: +3, quality: -4, learning: -2 },
        },
      ],
    },
    {
      title: "Analyze｜分析",
      desc: "测量后你要定位根因。",
      choices: [
        {
          text: "鱼骨图 + 5 Why 找根因",
          effect: { speed: -4, quality: +11, risk: -8, learning: +10 },
        },
        {
          text: "把责任归给新人",
          effect: { speed: +4, quality: -8, risk: +10, learning: -6 },
        },
      ],
    },
    {
      title: "Improve｜改进",
      desc: "根因在基础模块安装误差，你会？",
      choices: [
        {
          text: "试点防错工装并迭代 SOP",
          effect: { budget: -12, quality: +15, risk: -10, towerHeight: +2, learning: +10 },
        },
        {
          text: "靠监督提高注意力",
          effect: { budget: -4, quality: +2, risk: +3, speed: +2 },
        },
      ],
    },
    {
      title: "Control｜控制",
      desc: "改进后要防止反弹。",
      choices: [
        {
          text: "建立控制图与周会复盘机制",
          effect: { speed: -2, quality: +9, risk: -10, learning: +12, towerHeight: +1 },
        },
        {
          text: "阶段结束，撤销追踪",
          effect: { speed: +3, quality: -6, risk: +9, learning: -4 },
        },
      ],
    },
  ],
};

let mode = null;
let step = 0;
let state = { ...baseState };

const statsEl = document.getElementById("stats");
const towerEl = document.getElementById("tower");
const phasePanel = document.getElementById("phasePanel");
const phaseTitle = document.getElementById("phaseTitle");
const phaseDesc = document.getElementById("phaseDesc");
const choicesEl = document.getElementById("choices");
const summaryEl = document.getElementById("summary");

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function renderStats() {
  const fields = [
    ["预算", state.budget],
    ["质量", state.quality],
    ["速度", state.speed],
    ["风险(越低越好)", state.risk],
    ["团队学习", state.learning],
  ];

  statsEl.innerHTML = fields
    .map(([name, val]) => `<div class="stat-item"><span>${name}</span><strong>${val}</strong></div>`)
    .join("");
}

function renderTower() {
  const height = Math.max(1, Math.floor(state.towerHeight));
  towerEl.innerHTML = "";

  for (let i = 0; i < height; i += 1) {
    const block = document.createElement("div");
    block.className = "block";
    block.style.height = `${30 + i * 8}px`;
    const stability = clamp(100 - state.risk + state.quality / 2, 20, 100);
    const green = Math.floor(stability * 2.2);
    block.style.background = `rgb(${260 - green}, ${green}, 130)`;
    towerEl.appendChild(block);
  }
}

function applyEffect(effect) {
  Object.entries(effect).forEach(([key, delta]) => {
    state[key] = key === "towerHeight" ? state[key] + delta : clamp(state[key] + delta);
  });
}

function renderPhase() {
  const current = phases[mode][step];
  phaseTitle.textContent = `${step + 1}. ${current.title}`;
  phaseDesc.textContent = current.desc;
  choicesEl.innerHTML = "";

  current.choices.forEach((choice) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = choice.text;
    btn.onclick = () => {
      applyEffect(choice.effect);
      step += 1;
      renderStats();
      renderTower();
      if (step >= phases[mode].length) {
        showSummary();
      } else {
        renderPhase();
      }
    };
    choicesEl.appendChild(btn);
  });
}

function scoreLevel() {
  const score = state.quality + state.speed + state.learning + (100 - state.risk);
  if (score >= 300) return "卓越：你把方法论落地成了系统能力。";
  if (score >= 240) return "良好：项目交付可靠，仍可继续优化。";
  return "待提升：建议回顾数据链路与标准化动作。";
}

function showSummary() {
  phasePanel.classList.add("hidden");
  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <h2>训练总结</h2>
    <p>你完成了 <strong>${mode.toUpperCase()}</strong> 训练，塔台高度达到 <strong>${state.towerHeight}</strong> 层。</p>
    <p>最终评价：<strong>${scoreLevel()}</strong></p>
    <button id="restart">再次练习</button>
  `;
  document.getElementById("restart").onclick = start;
}

function start(selectedMode = mode) {
  mode = selectedMode;
  step = 0;
  state = { ...baseState };
  summaryEl.classList.add("hidden");
  if (!mode) return;
  phasePanel.classList.remove("hidden");
  renderStats();
  renderTower();
  renderPhase();
}

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => start(btn.dataset.mode));
});

renderStats();
renderTower();

# 塔台质控局 (Tower QC Bureau)

一个纯文本/数值逻辑驱动的教学桌游原型，演示：

- 第一阶段：PDCA 低成本快速试错。
- 第二阶段：DMAIC（Define/Measure/Analyze/Improve/Control）结构化解题。

## 运行方式

直接打开 `index.html`，或用本地静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 规则摘要

- 塔台判定核心：若任一层 `承重 S < 上层重量和 + 环境风力值` 则倒塌。
- 第二阶段目标：
  - 总高度 > 100
  - 总成本 < 5000
  - 抗风值 > 50
- Control 阶段会引入随机公差；购买 SOP 卡可缩小波动范围。

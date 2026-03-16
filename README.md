# 聚类训练营：K-Means 小游戏

这是一个前端单页小游戏，用可视化交互帮助理解 K-Means 聚类核心流程：

1. 分配（Assignment）：每个样本归到最近质心。
2. 更新（Update）：每个质心移动到簇内样本均值。
3. 迭代：重复上述步骤直到收敛。

## 运行

直接打开 `index.html`，或使用静态服务：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

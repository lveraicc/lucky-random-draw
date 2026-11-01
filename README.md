# 随机一注

双色球与大乐透随机模拟网页，使用老虎机式联排转轮揭晓安全随机结果。

**随机模拟 · 仅供娱乐，不代表官方开奖。**

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run build
npm run e2e
```

## 技术说明

- 最终号码在动画前通过 Web Crypto 生成。
- 使用拒绝采样和 Fisher–Yates 避免偏差。
- 历史最多保存 20 组，仅存于当前浏览器。
- 无后端、无账号、无真实购彩接口。

## 部署

运行 `npm run build` 后，将 `dist/` 部署到任意静态托管平台。托管平台需将未匹配路径回退到 `index.html`。

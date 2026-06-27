# Brain Nutrient Map Web

AI 延续学实验 002：脑健康成分地图。

这个项目来自 2026-06-26 AI 生命延续学商机日报中的“麦角硫因（Ergothioneine）成分科普 × 中年女性脑健康选题包”。它把一条研究新闻线索改造成一个中文互动网页工具：用户选择自己的脑健康关注点，得到食物来源表、观察建议、可下载分享卡，以及 AI 生活方式解读报告。

## 产品定位

- 目标用户：35-60 岁关注记忆力、脑雾、更年期脑健康的人，以及正在照顾父母健康的子女。
- 免费入口：脑健康成分地图、麦角硫因食物来源表、分享卡、AI 短版摘要。
- 低价验证：9.9 元「中年脑健康自查清单」资料包。
- 付费升级：19.9 元 AI 详细脑健康生活方式解读报告，使用一次性兑换码生成。
- 视觉增强：AI 生成无文字报告配图，和文字报告组合成更适合转发/保存的交付物。

## 合规边界

本项目不声称麦角硫因可以预防痴呆，不推荐任何补充剂，不提供诊断、治疗、检测或用药建议。页面仅用于健康信息整理、科普和自我复盘。

## 本地使用

静态前端直接打开 `index.html` 即可。

AI 报告后端在 `worker/`，部署到 Cloudflare Worker。API Key 只能通过 Worker Secret 配置，不能写进前端或仓库。

```bash
cd worker
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put IMAGE_API_KEY
wrangler deploy
```

线上 Worker：

```text
https://brain-nutrient-map-api.sabrinamisan090.workers.dev
```

## 来源

- AI 生命延续学商机日报 2026-06-26。
- News-Medical: Blood metabolites reveal lifestyle links to brain health before dementia.
- News-Medical: Longer hormone exposure linked to healthier brain aging in women.

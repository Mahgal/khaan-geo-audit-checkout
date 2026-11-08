# SUBMISSION 检查单 — PayPal AI Hackathon

> 内部提交目标：**2026-11-12 06:00 CST 前点击 Submit**（官方截止 2026-11-13 04:00 CST ＝ 11-12 12:00 PST，见 docs/RULES.md §1）。
> 官方页：https://paypalaihackathon.devpost.com/
> 完整方案与文案：`~/workspace/khaan-si/hackathon-paypal/`（PLAN.md / devpost-copy.md / video-script.md 均已定稿）。

## A. 已完成（2026-11-08）

- [x] 规则核实落盘（`docs/RULES.md`）：截止/奖金/评审五项/提交物/资格/排除名单
- [x] 设计定案（`docs/DESIGN.md`）：KHAAN GEO Audit Checkout，沿用 11-07 已拍板方案
- [x] 脚手架跑通：零依赖 Node 应用，demo 模式下预览→下单→确认全流程可跑（本地验收记录见仓内提交说明）
- [x] README 草稿（Devpost 字段口径：Inspiration / What it does / How we built it / Tools / 运行说明）
- [x] LICENSE（MIT）置于仓顶层
- [x] Devpost 项目文案定稿（在 `~/workspace/khaan-si/hackathon-paypal/devpost-copy.md`，含三处占位符 `<DEMO_URL>`/`<REPO_URL>`/`<VIDEO_URL>` 待回填）
- [x] 演示视频脚本定稿（`video-script.md`，目标 2:30，硬上限 2:55）

## B. 等用户 sandbox app（唯一的外部阻塞项）

- [ ] 用户在 developer.paypal.com 建 **Sandbox REST app**（Merchant 类型，名建议 `khaan-geo-demo`）→ 取得 Client ID / Secret（步骤见回报给主代理的用户操作清单）
- [ ] 凭据经约定通道交接（浏览器在其登录态下从 app 页读值，直填部署 `.env`；**不经聊天明文**）→ 写入本机 `.env` 与部署环境 secrets
- [ ] 确认 Sandbox **Personal 买家测试号**存在（Dashboard → Testing Tools → Sandbox Accounts，平台自动生成；其密码只存保险库）
- [ ] 接真链验收（`docs/INTEGRATION-TODO.md` §3）：成功付款 ×1、取消 ×1、失败重试 ×1、金额防篡改抽查

## C. 等凭据到位后（11-09 起，助手）

- [ ] /api/preview 真实采样调优：5 问模板、命中判定、≤60 秒返回、缓存策略
- [ ] 部署托管 demo：`geo-demo.khaan.si`（Pages＋Worker＋KV）；备选 pages.dev 默认域
- [ ] 部署后以评委视角（无痕窗口）走全流程 ≥1 次

## D. 开源仓（11-10，助手）

- [ ] 本仓 push 到公开 GitHub（默认用当前可用账号；公司号 KhaanSI 恢复则改挂）
- [ ] About 区 license 显示正常；README 内 `<REPO_URL>` 等占位符全替换
- [ ] push 前密钥扫描（grep secret 模式）通过；`.env`、`data/` 已在 .gitignore

## E. 视频（11-11，助手）

- [ ] 按 `video-script.md` 录屏（全流程真实操作；录前跑通一次并清缓存；密码字段不入镜）
- [ ] 剪辑至 <3:00（目标 2:30）；无第三方商标装饰、无版权音乐
- [ ] 上传 YouTube 并设 **public**；链接回填 Devpost 草稿与 README

## F. 提交（11-11 填表 → 11-12 06:00 CST 前 Submit）

- [ ] Devpost 草稿：项目名/Tagline/正文（devpost-copy.md 逐段粘贴）、Tools 段、Built With 标签、封面图（自家黑金素材）
- [ ] Demo URL、仓链接、视频链接三处回填并逐一打开验证
- [ ] 按官方 **Rules 页逐条复核**资格与材料（11-08 未能逐字打开规则全文，见 RULES.md §8）
- [ ] 点击 Submit → 截图存档 → 在主聊天回报用户

## G. 赛后

- [ ] 评审期（12-01 → 12-15）demo 保持在线并纳入巡检；不再改代码
- [ ] 获奖公布约 12-21，盯 Devpost 与邮箱通知

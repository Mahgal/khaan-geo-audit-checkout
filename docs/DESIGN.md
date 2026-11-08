# 设计一页纸 — KHAAN GEO Audit Checkout

> 沿用 2026-11-07 已拍板方案（`~/workspace/khaan-si/hackathon-paypal/PLAN.md` 为完整版，含文案与视频脚本已定稿）；本页是执行摘要＋与评审标准的对应表＋小时级排期。

## 1. 解决什么问题

买家越来越不看链接列表，而是直接问 AI、读一条合成答案。品牌若不在那条答案里，不是「排名靠后」，而是**缺席**。
品牌方目前无从知道自己在 AI 答案里的可见度，更没有一键购买「查清楚＋给修法」的服务。

**产品**：输入品牌名 → AI 当场用真实买家问题采样 AI 搜索答案 → 出具可见度预览（出现/缺席、谁在替你出现）→ **PayPal 一键结账 $299** 订购完整 GEO 审计。它是 khaan.si 已上线 GEO 服务（$499 定价、首批 $299）的在线下单段，赛后换 live 凭据即转生产，不是抛弃型 demo。

## 2. 流程（单页，30 秒看懂）

输入品牌＋品类 → `POST /api/preview` 生成 5 个买家问题、逐个走 khaan.si 实时搜索/答案管线采样、命中判定 → 预览卡（Visibility snapshot＋逐问结果＋竞品点名＋AI 点评，标注单引擎单次采样）→ 价格区点 PayPal → sandbox 结账弹窗 → 服务端 capture → 成功页（订单号、金额、交付说明）。

## 3. PayPal 集成点 × 评审标准对应

| 集成/实现 | 对应评审标准 |
|---|---|
| Orders v2 **服务端** create/capture（金额服务端写死 $299.00，前端不可改价）、JS SDK Buttons、OAuth2 client-credentials | Technological Implementation（用得深、用得对）＋ Best Use of PayPal + AI 叙事 |
| PayPal 是唯一成交通道；AI 预览是免费漏斗、支付是价值兑现点——两者互为核心 | 「有意义地同时使用」的硬要求；Potential Impact（真实服务、真实定价页已上线） |
| 预览引擎复用 khaan.si 生产管线（多源搜索＋Workers AI 合成＋来源标注），非贴图造假 | Technological Implementation / Innovation（GEO 品类本身新） |
| 单页完整产品体验：预览→下单→确认→（失败/取消有明确回路） | Design |
| <3 分钟视频：真流程全程实录（脚本已定稿） | Presentation / Best Demo Delivery |
| 不可选装：AG Grid/APIMatic 等赞助工具**不硬塞**（与产品无关，塞了反而稀释叙事） | —（明确取舍） |

## 4. 技术栈

- 本脚手架：**Node.js 零依赖**（内置 http/fetch）单体：静态页＋4 个 API 端点＋JSON 文件订单存储；本地 `node server.js` 即跑。无凭据时自动 **demo 模式**（结账链走同形模拟端点并显著标注），保证评委/任何人 clone 后零配置可跑全流程。
- 生产形态（11-09/10 部署时）：同代码逻辑平移到既定方案——Cloudflare Pages＋Worker 子域 `geo-demo.khaan.si`，KV 存订单（PLAN.md §4）；Node 版同时可直接部署到 A1/Render 作备份 demo 入口。
- AI：khaan.si 搜索/答案管线（Bing/RSS/DDG 多源＋Workers AI llama-3.3-70b）；本仓 `/api/preview` 通过其公开 `/api/ask` 采样，超时降级为**明示标注**的缓存快照。
- 支付：PayPal JS SDK ＋ Orders v2（sandbox），凭据只在服务端 env。

## 5. 排期（CST；内部硬截止 11-12 06:00 提交完毕，官方截止 11-13 04:00）

| 时段 | 里程碑 | 负责人 |
|---|---|---|
| 11-08 晚（今晚） | 规则核实落盘 ✓；脚手架跑通（本仓，demo 模式全流程）✓；用户建 sandbox app | 助手＋**用户（约 5 分钟）** |
| 11-09 上午 | 凭据到位 → 接真 create/capture；沙盒买家号端到端付款自测 ≥3 次（含取消/失败各 1） | 助手 |
| 11-09 下午–晚 | /api/preview 真实采样调优（问题模板、命中判定、≤60s 返回）；预览卡 UI 打磨 | 助手 |
| 11-10 | 部署 geo-demo 子域（或 pages.dev 备份域）；公开仓整理：README 定稿、LICENSE、密钥扫描后 push；Devpost 项目草稿建好 | 助手 |
| 11-11 上午 | 按既定脚本录屏＋旁白；YouTube 上传 public；回填链接 | 助手（上传遇账号验证时用户搭手） |
| 11-11 下午–晚 | Devpost 表单填满；按官方 Rules 逐条复核资格/材料；评委视角无痕走查全流程 | 助手 |
| 11-12 06:00 前 | **点击 Submit**，截图存档，在主聊天回报 | 助手 |
| 11-12 → 12-15 | demo 保持在线（评审期），纳入站点巡检；不再改代码 | 助手 |

## 6. 红线（沿用已定口径）

- 文案零虚构：无客户名单、无收入/用户数/评价；演示示例用虚构品牌或公开品牌的客观采样事实，不给真实品牌下结论性断言。
- 任何 secret 不进仓、不进前端、不进聊天；买家测试号密码只存保险库/本地 env。
- 不动 khaan.si 主站任何页面与配置；demo 全隔离子项目。

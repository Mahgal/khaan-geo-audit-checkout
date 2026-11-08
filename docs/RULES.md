# PayPal AI Hackathon — 规则核实档案（RULES）

> 核实时间：2026-11-08（助手实查官方页）。来源优先级：官方 Devpost 页 > PayPal 官方博客 > 二手解读（仅作交叉验证，已标注）。
> 官方页：https://paypalaihackathon.devpost.com/
> PayPal 官方博客：https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/

## 1. 比赛与截止（官方实查）

- 名称：**PayPal AI Hackathon — "Build What's Next with PayPal and AI"**，PayPal 主办、Devpost 运营，全程线上。
- 提交窗口：2026-10-01 开放 → **2026-11-12 12:00 PM PST 关闭**（官方活动时间戳：2026-11-12T15:00:00-05:00，即 15:00 EST ＝ 20:00 UTC）。
- **换算北京时间（CST, UTC+8）：2026-11-13 04:00**。
  - ⚠️ 更正流传口径：「11-12 06:00 CST」不是官方截止，而是我们自设的**内部提交目标**（提前约 22 小时交卷，免疫时区误读）。按内部目标执行不变。
- 评审期：2026-12-01 14:00 PST → 2026-12-15 08:00 PST（据官方规则摘要）；**托管 demo 必须在整个评审期保持可访问**。
- 获奖公布：约 2026-12-21（规则口径「on or around Dec 21, 2:00 PM PT」为准；Devpost 日程页写 Dec 21 9:00 AM PST，两者小出入，以规则为准）。
- 参赛规模参考：Devpost 列表显示约 30,000 名参与者（2026-11-08 所见），竞争烈度高，作品完成度与演示质量是关键。

## 2. 奖金结构（官方页逐项）

总盘 **$69,750** ＝ $67,500 现金 ＋ $2,250 Render 额度；共 23 个奖项（20 现金＋3 额度）。

| 奖项 | 金额 | 名额 |
|---|---|---|
| 1st Place | $12,000 现金 | 1 |
| 2nd Place | $8,000 现金 | 1 |
| 3rd Place | $5,000 现金 | 1 |
| Most Creative | $5,000 现金 | 1 |
| Most Impactful | $5,000 现金 | 1 |
| Best Demo Delivery | $5,000 现金 | 1 |
| Best Use of PayPal + AI | $5,000 现金 | 1 |
| Best Use of Agentic Commerce | $5,000 现金 | 1 |
| Best Use of AG Grid — 1st / 2nd / 3rd | $5,000 / $2,000 / $1,000 现金 | 1 / 1 / 3 |
| Best Use of APIMatic | $1,000 现金 ＋ 6 个月 APIMatic Business | 3 |
| Best Use of Bryntum | $1,000 现金 | 3 |
| Best Use of Channel3 | $1,500 现金 | 1 |
| Best Use of Render — 1st / 2nd / 3rd | $1,000 / $750 / $500 **Render 额度** | 各 1 |

## 3. 主题与必用技术（官方实查）

- **无赛道、无命题**（no tracks, no prescribed problem statements）。
- **唯一硬要求：项目必须「有意义地」同时使用 ① PayPal 开发者平台（免费 sandbox 环境）与 ② 任意 AI 工具/模型/平台**，且 PayPal 集成要成为项目核心（central），不是装饰。
- **不强制** PayPal Agent Toolkit、MCP、某个特定 API——Orders API、Checkout、Payouts、Invoicing 等任选其一做深即可；PayPal 家族服务（Venmo、Braintree 等）据规则摘要亦计入。
- 赞助商工具（AG Grid、APIMatic、Astropods、Bryntum、Channel3、Elastic、KERNEL、Postman、Render、Zapier）**全部可选**，只与各自赞助奖相关；不用不扣分。
- 既有项目可参赛，条件：比赛期间有**实质进展**（meaningful progress）。

## 4. 评审标准（官方页原文五项）

| 标准 | 官方问句（意译） |
|---|---|
| Technological Implementation | 对 PayPal 开发者平台与 AI 工具的使用是否深入、娴熟；是否真实投入、工作正常、非平凡实现 |
| Design | 是否交付完整、连贯的**产品体验**，而不只是技术概念验证 |
| Potential Impact | 是否对「为真实受众解决真实问题」给出可信、具体的论证；演示内容是否真的解决了它 |
| Innovation / Idea | 概念是否新颖，与既有方案差异何在 |
| Presentation | 视频是否清楚展示端到端运行；pitch 是否讲清问题、受众与价值；整体是否易懂 |

- 权重：**官方主页未公布权重**。二手规则解读（reconscribe 对官方规则的整理）称流程为「先过 fit 合格线，再按五项**等权重**打分」——未在官方页逐字核到，执行上按五项等权重对待（即视频与产品完整度与技术同等重要）。
- 启示：单设 **Best Demo Delivery $5,000**＋Presentation 独立成项 → 演示视频值得单独花半天打磨。

## 5. 提交物清单（官方 What to Submit 逐项）

1. **Project**：满足 §3 的工作原型/概念验证，充分文档化。
2. **Text description**：项目功能与特性说明。
3. **Functional demo**：评委必须能实际运行/交互——托管 demo URL **或** 仓内完整搭建运行说明，二选一达标；**设计稿/静态原型/不可用 demo 不合格**。
4. **Tools**：列明所用工具（模型/AI 服务）及各自用法。
5. **Public code repository**（GitHub / GitLab / Bitbucket）：含全部源码、素材与运行说明；**公开开源，license 文件置于仓顶层**（About 区可见）。
6. **Demo video**：**< 3 分钟**（评委不保证看完 3 分钟后内容）；展示项目在目标设备上真实运行；**YouTube 公开**，链接填入提交表；不得含未授权的第三方商标/版权音乐素材。
7. 表单惯例字段（Devpost 通用，未在官方页逐项列出，建草稿时以实际表单为准复核）：Built With 标签、项目封面图、分类勾选等。

## 6. 参赛资格（官方＋规则摘要交叉验证）

- 个人达到居住地法定成年年龄即可；**个人、团队（人数无上限）、组织**均可。
- 全球开放，**排除**：巴西、魁北克、俄罗斯、克里米亚、古巴、伊朗、朝鲜及其他全面受制裁地区。**中国不在排除名单 → 创始人以中国居民身份可参赛。**
- 无报名费；sandbox 免费。

## 7. Sandbox App 的用途与所需权限（PayPal 官方文档核实）

- 用途：sandbox REST app 是我们服务端调用 PayPal API 的身份——其 **Client ID / Client Secret** 用于 OAuth2 换取 access token，再调 **Orders v2**（create → 前端 approve → capture）。没有它，支付链无法真实跑通（不存在官方共享 demo 凭据）。
- 本项目所需：仅 **Checkout（Orders v2）**。建 app 时选 **Merchant** 类型、保留默认功能集即可；**不需要** Payouts、Invoicing、Subscriptions、Log in with PayPal 等额外权限/功能。
- 演示付款：Dashboard → Testing Tools → **Sandbox Accounts** 里平台自动生成的 **Personal（买家）测试号**，在 sandbox 结账弹窗里登录付款；Business 号即收款方，与 app 绑定的商户号对应。
- 凭据安全：Client Secret 只进服务端 env/密钥存储，**永不进 Git 仓、前端、聊天明文**。

## 8. 未能逐字核实的点（诚实标注）

- 官方 **Official Rules 全文 PDF** 未能直接打开逐条核（Devpost 页抓取文本未暴露规则全文链接）；资格排除名单、评审期、公布时间取自官方页＋两家对规则的整理交叉一致。**提交前（11-11）须再开 Rules 页逐条过一遍**，已列入 SUBMISSION.md。
- Devpost 提交表单的完整字段清单在未登录建草稿前不可见；§5 第 7 项按 Devpost 通用惯例预写，建草稿时复核。

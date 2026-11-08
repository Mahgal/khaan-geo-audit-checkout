# PayPal 集成 TODO — 凭据到位后逐项接线清单

> 现状：脚手架已实现全部调用点的代码路径；无凭据时自动走 demo 模式（同形模拟，显著标注）。
> 凭据到位后要做的只有：把值填进 `.env`（见 `.env.example`），重启服务，逐项跑下面的验收。代码改动点逐项列明，正常情况**零改代码**。

## 0. 凭据落位

- [ ] `.env` 填入 `PAYPAL_CLIENT_ID`、`PAYPAL_CLIENT_SECRET`（sandbox 值），`PAYPAL_ENV=sandbox`，`PAYPAL_API_BASE=https://api-m.sandbox.paypal.com`
- [ ] 重启 `node server.js` → 打开页面，demo 模式横幅应消失，PayPal 官方按钮渲染
- [ ] `GET /api/config` 应返回 `{ mode: "sandbox", clientId: <与 Dashboard 一致> }`，且**不含 secret**

## 1. 调用点清单（全部在 `lib/paypal.js`，服务端）

| # | 调用 | 端点 | 触发点 | 验收 |
|---|---|---|---|---|
| 1 | OAuth2 换 token | `POST {API_BASE}/v1/oauth2/token`（Basic client:secret，`grant_type=client_credentials`） | create/capture 前自动（带内存缓存，过期前刷新） | 日志出现 token 获取成功；错误时页面报可读错误而非 500 裸奔 |
| 2 | 创建订单 | `POST {API_BASE}/v2/checkout/orders`，`intent: "CAPTURE"`，金额**服务端写死** `299.00 USD`，`custom_id` = 我方订单 ID | 前端 PayPal Buttons `createOrder` → 打我方 `POST /api/orders/create` | 返回 PayPal order id；sandbox 商户后台（Sandbox Accounts 的 Business 号）可见待批订单 |
| 3 | 前端批准 | PayPal JS SDK 弹窗内买家登录并 Approve | 买家用 **Sandbox Personal 测试号**在弹窗付款 | 弹窗正常关闭并回调 `onApprove` |
| 4 | 捕获订单 | `POST {API_BASE}/v2/checkout/orders/{id}/capture` | 前端 `onApprove` → 打我方 `POST /api/orders/capture` | 返回 `status: "COMPLETED"` 且金额 = 299.00 USD；订单落库（本地 `data/orders.json`／生产 KV），状态 `PAID` |
| 5 | （保险）查单 | `GET {API_BASE}/v2/checkout/orders/{id}` | capture 响应异常/超时时兜底核对 | 状态与本地记录一致，不重复 capture |

## 2. 前端接线点（`public/index.html`）

- [ ] 页面加载时 `GET /api/config` 拿 client-id → 动态注入 `https://www.paypal.com/sdk/js?client-id=...&currency=USD` → `paypal.Buttons({ createOrder, onApprove, onCancel, onError })` 渲染
- [ ] `onCancel`：回价格区＋提示文案；`onError`：显示错误＋重试按钮（不生成订单）
- [ ] 成功页渲染：我方订单号＋PayPal order id＋金额＋交付说明；刷新页面不重复 capture（capture 幂等由订单状态守卫）

## 3. 端到端验收（接线后必跑，≥3 次）

- [ ] 成功付款 ×1：全链走通，sandbox 商户后台能看到 $299 收款
- [ ] 买家取消 ×1：无订单落库为 PAID，页面回价格区
- [ ] 失败重试 ×1（错误卡/中途关弹窗）：错误提示可读，重试可成功
- [ ] 金额防篡改抽查：改前端请求参数无法改变成交价（金额只认服务端常量）

## 4. 生产化备注（赛后，非本次提交范围）

- 换 live 凭据：用户主体在 developer.paypal.com 建 **Live** app（同流程），`PAYPAL_ENV=live`、`PAYPAL_API_BASE=https://api-m.paypal.com`，其余零改动。
- 订单存储从 `data/orders.json` 换 Cloudflare KV（key `order:<id>`），字段不变。

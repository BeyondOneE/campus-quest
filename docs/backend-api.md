# 电脑托管后端 API

[English](backend-api.en.md)

## 运行与身份

使用已验证的 Node.js 24.19.0，在仓库运行 `npm start`。应用监听 `http://127.0.0.1:4180/treasure-lab/`，英文页面和 API 同源。SQLite 数据保存于被忽略的 `.local/campus-quest.sqlite`。Python 诊断服务单独运行，不提供业务 API。

玩家可以注册本地用户名 / 密码账号，也可以继续临时访客模式。账号支持跨设备恢复场次成员与领取记录；访客仍使用昵称与八位场次码。两种方式均不验证学生身份。浏览器会话有效期 24 小时，账号凭据和成员关系持久保存在 SQLite。不同账号使用不同手机或独立浏览器配置。

访客建房 / 加入设置 `cq_session`，账号注册 / 登录设置 `cq_account`。两者均为 HttpOnly、SameSite=Strict Cookie，HTTPS 下另加 Secure。成功账号与游戏响应包含 `csrfToken`；已登录 POST 通过 `X-CSRF-Token` 传回，包括账号模式的切房和退出。过期账号 Cookie 不会自动降级成访客。交接记录不保存或打印 Cookie / CSRF 值。

## 账号

没有访客房间时注册成功的账号状态示例如下，值仅用于文档。未登录成功响应为 `{ "account": null, "rooms": [], "activeRoom": null }`，不含 `csrfToken`。有当前成员时 `activeRoom` 为房间码，`rooms` 包含 `{ code, role }`。注册 / 登录不返回游戏状态包，应随后读取该房间 `/api/state`。

```json
{
  "account": { "id": "example-account", "username": "explorer" },
  "csrfToken": "<csrf-token-from-response>",
  "activeRoom": null,
  "rooms": []
}
```

| 方法与路径 | JSON 请求 / 结果 |
| --- | --- |
| `GET /api/auth/session` | `{ account: { id, username }, csrfToken, activeRoom, rooms: [{ code, role }] }`；未登录返回 `account: null`、空房间列表，不含 CSRF 值 |
| `POST /api/auth/register` | `{ username, password }`；HTTP 201，注册并登录，返回账号状态包 |
| `POST /api/auth/login` | `{ username, password }`；HTTP 200，创建新的浏览器登录会话，返回账号状态包 |
| `POST /api/auth/logout` | `{}`；HTTP 200，撤销本次账号会话、释放其临时定位状态并清除两种 Cookie；其他设备继续登录 |

用户名为 3–32 位 ASCII 字母、数字或下划线，统一小写保存。密码为 1–128 个 Unicode 码点，长度以外不设强度要求（2026-11-04 用户决定），空格保留，不回传或记录。后端采用异步加盐 scrypt（`N=131072, r=8, p=1`，16 字节随机盐），最多同时进行两个密码运算。参考 [OWASP 密码存储指导](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) 与 [Node crypto](https://nodejs.org/download/release/latest-v24.x/docs/api/crypto.html)。测试服务上限：1,000 个账号、每账号八个会话、每地址每 15 分钟 20 次认证尝试、每规范化用户名每 15 分钟八次。限流窗口只在内存中，重启会清空。并发运算超限返回 429 `AUTH_BUSY`。

注册携带有效访客 Cookie 和对应 CSRF 时，将当前访客的场次、玩家 ID、房主权限和领取记录关联到新账号，旧访客令牌随即失效。登录恢复账号最近使用的房间，不合并无关访客进度。重进已有房间恢复原玩家，不新增成员。一个账号可属于多个房间，当前房间属于浏览器登录会话；各设备临时定位判定独立，登录不会恢复旧定位或开启硬件。领取凭据跨设备共享，重复领取返回原凭据。

登录但尚未加入房间时，应先创建 / 加入，再调用 `GET /api/state`，否则返回 409 `ROOM_REQUIRED`。账号建房 / 加入无需 `name`，后端使用账号用户名。账号模式下所有游戏 POST 必须在原请求字段外携带当前看到的 `roomCode`，场次变化返回 409 `ROOM_CHANGED`；访客也可携带该字段。错误密码与不存在用户统一返回 401 `INVALID_CREDENTIALS`；无效输入返回 400、重复用户名 409、登录过期 401 `ACCOUNT_SESSION_EXPIRED`。

当前是本地密码认证，没有邮箱验证、学校统一登录、密码找回、账号删除或资料编辑。手机应使用可信 HTTPS。界面只补英文功能入口，视觉设计仍由 Claude 负责。

## 路由

| 方法与路径 | JSON 请求 / 结果 |
| --- | --- |
| `GET /api/health` | 公开就绪状态 `{ ok, service, version }` |
| `POST /api/rooms` | 访客 `{ name }`；账号 `{}` 并携带账号 CSRF。创建房间与房主，HTTP 201 状态包 |
| `POST /api/rooms/join` | 访客 `{ name, code }`；账号 `{ code }` 并携带账号 CSRF。HTTP 201 状态包，账号恢复已有成员 |
| `GET /api/state` | 当前玩家、场次、名单、定位判定和收集凭据 |
| `POST /api/location` | `{ roomCode, treasureId, fix: { latitude, longitude, accuracy, timestamp } }`；HTTP 200 状态及 `accepted: boolean` |
| `POST /api/location/stop` | `{ roomCode }`；HTTP 200 状态，清除本会话最近位置 / 进入观察 |
| `POST /api/treasure` | `{ roomCode, treasureId, radius }`；仅房主，HTTP 200 新共享轮次状态，按最近有效位置放置 |
| `POST /api/collect` | `{ roomCode, treasureId, cameraLive: true }`；HTTP 200 状态及 `collection: { id, collectedAt, repeated }` |

创建与加入返回 HTTP 201，其他成功返回 200。状态包包含 `serverTime`、`csrfToken`、`room`、`player`、`state`、`report`、`receipt` 与 `players`。场次信息含八位场次码、当前 `treasureId`、半径、放置状态、人数和 `one-claim-per-player` 策略。接口不返回已保存的宝藏坐标或其他玩家的最近坐标。`state` 包含 `kind`、`phase`、`distance`、`eligible`、`canPlace`、`expiresInMs`。凭据字段为 `id`、`collectedAt`；重复领取返回原凭据及 `repeated: true`。

尚未放置时 `treasureId` 为 null。变更请求携带当前已知值；宝藏更换后，旧值请求返回 409 `TREASURE_CHANGED`。重新读取状态后再发送新位置。重新放置开始新轮次，不删除旧凭据。只有创建者可更换宝藏，每位玩家独立领取一次；这是实验规则，尚未确定最终多人玩法。

错误格式为 `{ error: { code, message } }`，提示用英文。主要状态：400 输入错误，401 身份缺失 / 过期，403 Origin / CSRF / 创建者权限拒绝，404 场次或路由不存在，409 房间 / 宝藏变化或定位条件不满足，413 请求过大，415 内容类型错误，429 测试服务限额。不开放 CORS；POST 要求 JSON 与已允许的 Origin。HTTP 请求体上限 8192 字节；每场允许 16 位有效玩家；创建 / 加入按连接地址每分钟限制 20 次。局域网代理覆盖转发的客户端地址，后端仅监听回环并信任该本地代理；今后增加其他代理须保持此边界。

## 前端适配与定位行为

前端使用 [RemoteTreasureSession](../public/treasure-lab/client.js)，不能将浏览器本地 `TreasureSession` 当成产品权威状态。适配器提供异步 `resume()`、`connect(name, code)`、`receive(fix)`、`place(radius)`、`collect()`、`refresh()`；`start(now)` / `stop(now)` 对应硬件启停，`snapshot(now)` / `report(now)` 显示缓存的后端结果。当前控制器在前台每 2 秒轮询。网络错误暂停领取，停止后的迟到响应不能重新激活本地采集。相机生命周期仍在手机端，需保留权限、画面更新和后台停止判定。

账号使用 `authenticate('register' | 'login', username, password)` 和 `logout()`，显示 `account` 与 `accountRooms`；`resume()` 先获取账号状态，再恢复游戏。CSRF 只放内存，Cookie 保持 HttpOnly，页面提交后立即清空密码框。切换身份和登录过期均停止硬件；不将密码或令牌写入 localStorage、报告或界面错误信息。

后端复用已测定位模型：初始半径 30 米，可设 15–100 米；精度门槛 20 米、退出缓冲 10 米、有效位置最长 15 秒、返回观察至少 2 秒且使用不同时间戳。均为实验参数。客户端坐标及 `cameraLive` 都是不可信上报，因此不构成防作弊或真实相机使用证明；后端可防止正常界面绕过流程和重复领奖，实际精度仍需走测。

## 持久化、隐私与 HTTPS

SQLite 保存账号、密码哈希、登录会话、访客身份、场次成员、共享宝藏坐标和收集凭据。表结构升级保留旧 ID 与凭据，运行服务升级前已备份私密数据库。每个浏览器会话只在后端内存保留最近位置与观察状态，不保存移动轨迹；停止后清空位置，重启丢失临时定位状态，收集凭据和共享点仍保留。私密存储被 Git 忽略。相机画面不离开手机；报告不自动包含坐标，手写备注分享前自行检查。

当前手机方案改为 [局域网 HTTPS 直连](lan-access.md)，不使用外部转发。电脑提供本地证书安装页与 HTTPS 代理，手机用户须亲自安装并信任开发证书后再测硬件。将 `PUBLIC_ORIGIN` 设为准确的 HTTPS 来源，无路径、无末尾斜线，后端仍使用端口 4180。手机信任与网络可达尚未确认。此前 Cloudflare Quick Tunnel 已被自动审批拒绝且保持关闭；今后如启用外部提供方，仍需明确许可其数据处理。

服务仅提供九个公开静态文件及上述 API，不暴露仓库源码、私密存储或配置。当前是用户电脑上的开发服务，不是生产部署，也不是完整的正式多人产品。


## 前端请求顺序

新界面优先复用适配器，不必直接编写 fetch。下例只处理账号 / 房间连接，不开启硬件，也不是完整页面：

```js
import { RemoteTreasureSession } from '/treasure-lab/client.js';

const session = new RemoteTreasureSession();
await session.resume();
// 显示 session.account、session.connected、session.data 和 session.lastError。
// 以下函数仅在对应用户操作中调用，不能启动时自动执行：
async function signIn(username, password) {
  return await session.authenticate('login', username, password);
}
async function createRoom(guestNickname) {
  return await session.connect(guestNickname); // 账号模式忽略昵称
}
async function joinRoom(code, guestNickname = '') {
  return await session.connect(guestNickname, code.trim().toUpperCase());
}
```

启动时 `resume()` 先读 `/api/auth/session`；账号已登录而无 `activeRoom` 时显示选房。有账号房间或无账号但可能有访客时，再读 `/api/state`。新访客的 `SESSION_REQUIRED` 是正常未登录 / 无房间状态；账号过期须明确重新登录。`GET /api/state` 不包含 `account`，认证身份应读账号状态包 / 适配器 `account`，不能用 `player.role` 判断。

若直接请求：使用同源相对地址与 `credentials: 'same-origin'`，POST 仅发送 JSON；浏览器自行设置 `Origin`。将最近成功账号 / 游戏响应的 `csrfToken` 放内存，用 `X-CSRF-Token` 发送。Cookie、密码和 CSRF 不进入查询参数、localStorage 或共享日志。注册关联有效访客时需要访客 CSRF，账号切房使用账号会话 CSRF，游戏 POST 使用当前身份 CSRF 并携带 `roomCode`（账号必需，旧访客可选）；适配器自动完成。

换身份或房间前停止硬件并调用 `stop(now)`；主动开启真实浏览器定位 watch 后，以 `start(now)` / `receive(fix)` 对应其生命周期。停止时清除 watch 并调用 `stop(now)`，不存在 `/api/location/start` 接口。放置成功后使用新 `treasureId`，重新经历离开 / 返回。调用 `collect()` 前，调用者必须检查实时帧及 `snapshot(now).eligible`；适配器会发 `cameraLive: true`，但不能替调用者检查视频。成功后才能显示完成。在已连接 / 前台时用 `refresh()` 轮询，现有控制器每 2 s 轮询、每 500 ms 渲染；没有 WebSocket 或服务端推送。

## 适配器返回值与缓存

| 公开成员 | 契约 |
| --- | --- |
| `resume()` | 无返回载荷的 Promise，更新身份 / 房间或 `lastError`，不开启硬件 |
| `authenticate('register' \| 'login', username, password)` | `Promise<boolean>`，成功时恢复账号及存在的最近房间 |
| `logout()` | `Promise<boolean>`，成功后清空本地账号与游戏状态 |
| `connect(name, code = '')` | `Promise<boolean>`，空码建房、非空码加入；账号使用服务端用户名 |
| `start(now)` / `stop(now)` | 同步对应本地生命周期；`stop` 将服务端停止排队，并非等待停止完成 |
| `receive(fix)` | `Promise<boolean>`；false 可能是跳过进行中读数、重复时间戳被拒绝或请求失败，结合 `lastError` |
| `place(radius)` / `collect()` | `Promise<boolean>`，成功应用后端状态包，false 不能视为完成 |
| `refresh()` | 无返回载荷的 Promise，已连接且非忙碌 / 轮询中时更新游戏状态 |
| `snapshot(now)` | 缓存显示状态，加本地 active / online / 时效 / busy 门槛；按钮启用优先读它，不直接读 `data.state` |
| `report(now)` | 不自动含坐标的导出数据，附缓存房间 / 玩家 / 凭据 / 连接与客户端事件 |
| `account`、`accountRooms` | 当前账号或 null；最近认证响应的账号房间列表，连接时刷新，不是实时房间发现服务 |
| `connected`、`online`、`active`、`busy`、`lastError` | 当前房间身份、近期游戏 API 成功、本地定位分享状态、动作等待及英文错误字符串 |
| `data`、`fix`、`phase`、`zone`、`collectionCount` | 游戏状态包、最近接受的设备位置、阶段、仅含半径的已放置标记或 null、当前轮次计数 |

适配器没有订阅 / 自动渲染 API。等待操作 Promise 后渲染，并在控制器保留定时失效渲染和刷新。它串行请求、单请求超时 8 s，停止 / 换身份后不应用旧响应，并防止定位 / 轮询重叠。`fix` 在内存可能含精确设备坐标，不整体序列化适配器。网络失败禁止领取，但不证明服务端变更未发生；尤其不能自动重试建房、注册或重新放置，它们不幂等。同身份 / 同宝藏重复领取返回原凭据。断网时后端停止是尽力发送，本地硬件仍须立即释放。

## 完整游戏响应

下方为未放置访客响应示意，ID、房间码、CSRF 占位符和时间戳仅用于文档，不是真实会话、凭据或现场证据。时间 / 时长均用毫秒，距离 / 报告精度用米。`state.distance` 可以有小数，报告距离已取整；null 表示不可用，不是零。

```json
{
  "serverTime": 1800000000000,
  "csrfToken": "<csrf-token-from-response>",
  "room": {
    "code": "ABCDEFGH",
    "treasureId": null,
    "placed": false,
    "radius": 30,
    "policy": "one-claim-per-player",
    "playerCount": 1
  },
  "player": { "id": "example-player", "name": "Explorer", "role": "owner" },
  "state": {
    "kind": "stopped",
    "distance": null,
    "phase": "unplaced",
    "eligible": false,
    "canPlace": false,
    "expiresInMs": 0
  },
  "report": {
    "config": { "radius": 30, "exitMargin": 10, "maxAccuracy": 20, "maxAge": 15000, "dwell": 2000 },
    "phase": "unplaced",
    "treasurePlaced": false,
    "placementAccuracyMeters": null,
    "collectionCount": 0,
    "location": {
      "running": false,
      "samples": 0,
      "classification": "stopped",
      "distanceMeters": null,
      "accuracyMeters": null,
      "sampleAgeMs": null
    },
    "events": []
  },
  "receipt": null,
  "players": [ { "id": "example-player", "name": "Explorer", "collected": false } ]
}
```

`treasureId` 放置前为 null，之后为不透明字符串，必须使用返回原值，不能自行生成。`room.code` 为八位大写码，生成字符集为 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`；输入时 trim / 转大写，不悄悄接受任意码。访客昵称为去首尾空格后 1–32 字符且不含控制字符。位置纬度为 −90…90 的有限数，经度 −180…180，精度为非负有限数，时间戳为有限 Unix 时间。后端拒绝超过 15 s 或超前超过 5 s 的位置；重复 / 乱序时间戳可能 HTTP 200 且 `accepted: false`。HTTP 200 `accepted: true` 也不代表可领取，必须检查状态；超过 20 m 的精度可被记录，但不能解锁 / 放置。

`state.kind` 为 `stopped | waiting | stale | imprecise | unplaced | inside | outside | boundary`，`state.phase` 为 `unplaced | leave | return | ready | collected`。`eligible` 是定位资格，不证明相机实时。`expiresInMs` 是响应生成时服务端位置的剩余有效期，不可据此延长，适配器会在本地使缓存按钮过期。`canPlace` 已包括房主权限。停止或恢复的会话可以 `phase: collected`、`eligible: false` 且凭据非 null。

`receipt` 为 null 或 `{ id: string, collectedAt: number }`；`/api/collect` 另含 `collection: { id: string, collectedAt: number, repeated: boolean }`，`/api/location` 另含 `accepted: boolean`，其他游戏变更成功仅含同一基础状态包。`players` 是未过期成员，不是已验证在线状态；`player.role: 'guest'` 表示非房主，可能是已登录账号。`report.collectionCount` 为当前玩家 / 轮次 0 或 1，不是历史总数。`/api/auth/session` 的房间项 `{ code, role }` 没有背包或坐标。事件为 `{ at: ISO8601-string, event: string }`，仅诊断，不作为界面流程权威。成功游戏响应均不含原始经纬度。

## 界面错误恢复

错误统一为 `{ "error": { "code": "…", "message": "English explanation" } }`，以文本显示提示，不注入 HTML。下表说明恢复方向，不代表自动重试策略：

| HTTP / code | 前端处理 |
| --- | --- |
| 400 `INVALID_USERNAME`、`INVALID_PASSWORD`、`INVALID_NAME`、`INVALID_JSON`、`INVALID_FIX`、`CAMERA_REQUIRED` | 修正输入或取得必要真实位置 / 实时视频，不乐观显示成功 |
| 401 `SESSION_REQUIRED` | 无有效访客房间，显示访客建房 / 加入或账号入口 |
| 401 `ACCOUNT_SESSION_EXPIRED` | 停止硬件，清旧缓存身份，请求重新登录 |
| 401 `INVALID_CREDENTIALS` | 显示统一登录失败，不推断用户名是否存在 |
| 403 `CSRF_REQUIRED` | 获取对应账号 / 游戏状态包及新令牌，再进行下一次用户操作 |
| 403 `OWNER_REQUIRED` | 非房主继续禁用放置 |
| 403 `ORIGIN_REJECTED` / 415 `JSON_REQUIRED` | 修正同源 / 配置来源或 JSON 联调，不关闭保护 |
| 404 `ROOM_NOT_FOUND` | 保留加入入口，请用户检查房间码 |
| 409 `USERNAME_TAKEN`、`ALREADY_SIGNED_IN`、`ROOM_FULL` | 显示对应账号 / 房间指引，不自动重试循环 |
| 409 `ROOM_REQUIRED` | 已登录但无当前房间，显示选房 |
| 409 `ROOM_CHANGED`、`TREASURE_CHANGED` | 刷新状态，丢弃旧假设，切房时停硬件并观察当前轮次 |
| 409 `LOCATION_REQUIRED`、`NOT_ELIGIBLE` | 保留定位 / 离开返回条件，说明下一步 |
| 413 `BODY_TOO_LARGE` | 修正请求序列化，不发送图像 / 视频流或整个适配器 |
| 429 `RATE_LIMIT`、`AUTH_BUSY` | 暂停尝试，之后手动重试，目前不提供 `Retry-After` 值 |
| 429 `ACCOUNT_LIMIT`、`ROOM_LIMIT` | 测试服务容量已满，与后端负责人对接 |
| 404 `NOT_FOUND`、405 `METHOD_NOT_ALLOWED` | 检查文档路由 / 方法 |
| 500 `SERVER_ERROR`、超时 / 网络失败 | 禁止领取，显示服务恢复入口并谨慎重试 |

2026-11-03 已按 `server/app.mjs`、`server/store.mjs`、`server/index.mjs`、`public/treasure-lab/client.js` 和 `model.js` 核对本文。[前端交接](frontend-handoff.md) 列明修改范围与硬件验收边界。该基线已提交到本地 `main`（057b9d9），推送前远程克隆不包含它。

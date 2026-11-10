# 电脑托管后端 API

[English](backend-api.en.md)

右上角房间菜单提供 **Outdoor**（`gps`）和 **Indoor**（`indoor-ronin`）。新建房间默认 Indoor。加入或恢复房间时使用已保存的模式。切换模式会重置当前房间轮次。室内说明包含本地 `POST /api/ronin` 推理接口。[RoNIN 与模式切换](indoor-demo.md)

当前玩法：[2026-11-05 近场搜索](near-field-search.md) 取代下文最后 GPS 3 米领取 / 绝对罗盘门槛。GPS 解锁 15 米遭遇，再在短时本地坐标系转动搜索瞄准；滑条用于离开距离。

## 运行与身份

使用已验证的 Node.js 24.19.0，在仓库运行 `./start.sh` 可后台拉起后端及局域网 HTTPS，并检查健康状态、管理日志，见 [启动器命令](lan-access.md#一键启动)；手动只开后端仍可用 `npm start`。应用监听 `http://127.0.0.1:4180/treasure-lab/`，英文页面和 API 同源。SQLite 数据保存于被忽略的 `.local/campus-quest.sqlite`。Python 诊断服务单独运行，不提供业务 API。

玩家可以注册本地用户名 / 密码账号，也可以继续临时访客模式。账号支持跨设备恢复场次成员与领取记录；访客使用昵称和房间号。新房间使用四位数字，已有八位码仍可使用。两种方式均不验证学生身份。浏览器会话有效期 24 小时，账号凭据和成员关系持久保存在 SQLite。不同账号使用不同手机或独立浏览器配置。

访客建房 / 加入设置 `cq_session`，账号注册 / 登录设置 `cq_account`。两者均为 HttpOnly、SameSite=Strict Cookie，HTTPS 下另加 Secure。成功账号与游戏响应包含 `csrfToken`；已登录 POST 通过 `X-CSRF-Token` 传回，包括账号模式的切房和退出。过期账号 Cookie 不会自动降级成访客。交接记录不保存或打印 Cookie / CSRF 值。

## 账号

以下为在选房页注册成功的账号状态示例。未登录响应为 `{ "account": null, "activeRoom": null }`。浏览器会话在房间内时，`activeRoom` 为当前房间码。玩法状态从 `/api/state` 读取。

```json
{
  "account": { "id": "example-account", "username": "explorer" },
  "csrfToken": "<csrf-token-from-response>",
  "activeRoom": null
}
```

| 方法与路径 | JSON 请求 / 结果 |
| --- | --- |
| `GET /api/auth/session` | 已登录账号状态 `{ account: { id, username }, csrfToken, activeRoom }` |
| `POST /api/auth/register` | `{ username, password }`；HTTP 201，注册并登录，返回账号状态包 |
| `POST /api/auth/login` | 选房页发送 `{ username, password }`。HTTP 200 返回新的浏览器登录会话和 `activeRoom: null` |
| `POST /api/auth/logout` | 房间内发送 `{ roomCode, treasureId }`，选房页发送 `{}`。HTTP 200 表示已离开房间、撤销本次登录并清除两种 Cookie。房主登出时解散房间 |

用户名为 3–32 位 ASCII 字母、数字或下划线，统一小写保存。密码为 1–128 个 Unicode 码点，长度以外不设强度要求（2026-11-04 用户决定），空格保留，不回传或记录。后端采用异步加盐 scrypt（`N=131072, r=8, p=1`，16 字节随机盐），最多同时进行两个密码运算。参考 [OWASP 密码存储指导](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) 与 [Node crypto](https://nodejs.org/download/release/latest-v24.x/docs/api/crypto.html)。测试服务上限：1,000 个账号、每账号八个会话、每地址每 15 分钟 20 次认证尝试、每规范化用户名每 15 分钟八次。限流窗口只在内存中，重启会清空。并发运算超限返回 429 `AUTH_BUSY`。

注册携带有效访客 Cookie 和对应 CSRF 时，将当前访客的场次、玩家 ID、房主权限和领取记录关联到新账号，旧访客令牌随即失效。新登录从选房页开始。使用房间号重新加入开放房间，可恢复该账号原有的玩家身份和领取凭据。各设备的当前房间和临时定位判定独立。刷新浏览器会恢复当前房间。

登录但尚未加入房间时，应先创建 / 加入，再调用 `GET /api/state`，否则返回 409 `ROOM_REQUIRED`。账号建房 / 加入无需 `name`，后端使用账号用户名。账号模式下所有游戏 POST 必须在原请求字段外携带当前看到的 `roomCode`，场次变化返回 409 `ROOM_CHANGED`；访客也可携带该字段。错误密码与不存在用户统一返回 401 `INVALID_CREDENTIALS`；无效输入返回 400、重复用户名 409、登录过期 401 `ACCOUNT_SESSION_EXPIRED`。

当前是本地密码认证，没有邮箱验证、学校统一登录、密码找回、账号删除或资料编辑。手机应使用可信 HTTPS。界面只补英文功能入口，视觉设计仍由 Claude 负责。

## 路由

| 方法与路径 | JSON 请求 / 结果 |
| --- | --- |
| `GET /api/health` | 公开就绪状态 `{ ok, service, version }` |
| `GET /api/progress` | 登录后查看排行榜和个人图鉴，选房页及房间内均可调用 |
| `POST /api/rooms` | 访客 `{ name }`；账号 `{}` 并携带账号 CSRF。创建房间与房主，HTTP 201 状态包 |
| `POST /api/rooms/join` | 访客 `{ name, code }`；账号 `{ code }` 并携带账号 CSRF。HTTP 201 状态包，账号恢复已有成员 |
| `POST /api/rooms/leave` | `{ roomCode, treasureId }` 并携带会话 CSRF。退出当前房间，房主调用则解散房间。HTTP 200 账号状态包含 `activeRoom: null` |
| `POST /api/rooms/reset` | `{ roomCode, treasureId }`，仅房主可请求，需携带会话 CSRF。关闭当前房间，HTTP 200 账号状态包含 `activeRoom: null` |
| `GET /api/state` | 当前玩家、场次、名单、定位判定和收集凭据 |
| `GET /api/guide` | 进房前也可读取向导上下文和记录。见 [向导契约](ai-guide.md)。 |
| `POST /api/guide` | 发送 `message` 或 `event` 和可选 `page`。房间内附带 `roomCode` 和 `treasureId`。回复可包含教程 ID。 |
| `POST /api/location` | `{ roomCode, treasureId, fix: { latitude, longitude, accuracy, timestamp } }`；HTTP 200 状态及 `accepted: boolean` |
| `POST /api/location/stop` | `{ roomCode }`；HTTP 200 状态，清除本会话最近位置 / 进入观察 |
| `POST /api/treasure` | `{ roomCode, treasureId, radius }`；仅房主，HTTP 200 新共享轮次状态，按最近有效位置放置 |
| `POST /api/aim` | `{ roomCode, treasureId, sample }`；HTTP 200 状态及 `accepted: boolean`；`sample: null` 清空瞄准 |
| `POST /api/collect` | `{ roomCode, treasureId, cameraLive: true }`；HTTP 200 状态及 `collection: { id, collectedAt, repeated }` |

创建与加入返回 HTTP 201，其他成功返回 200。状态包包含 `serverTime`、`csrfToken`、`room`、`player`、`state`、`report`、`receipt` 与 `players`。场次信息含字符串形式的房间号、当前 `treasureId`、半径、放置状态、人数和 `one-claim-per-player` 策略。接口不返回已保存的宝藏坐标或其他玩家的最近坐标。`state` 包含 `kind`、`phase`、`distance`、`eligible`、`canNavigate`、`guidance`、`aim`、`canClaim`、`canPlace`、`expiresInMs`。凭据字段为 `id`、`collectedAt`；重复领取返回原凭据及 `repeated: true`。

新房间在放置宝藏前就有独立的 `treasureId`，未放置的旧房间可能仍返回 null。变更请求携带当前已知值，以便在四位号再次分配时区分轮次。宝藏更换后，旧值请求返回 409 `TREASURE_CHANGED`，重新读取状态后再发送新位置。重新放置开始新轮次并保留旧凭据。只有创建者可更换宝藏，每位玩家可独立领取当前宝藏一次。

房主在界面确认 **Leave room**、**Sign out** 或 **Reset demo** 后，后端在同一事务内删除当前房间、成员和领取凭据，清除相关会话的当前房间，再清理该房间的临时定位、瞄准和向导会话。轮询中的访客收到 `SESSION_REQUIRED`、已登录玩家收到 `ROOM_REQUIRED` 后回到选房页。房间码尚未重新分配时，加入会返回 404。

普通参与者退出会结束当前设备的房间会话。账号玩家可凭房间号重进并恢复领取凭据。最后一台设备退出后，名单移除该玩家。在房间内创建或加入其他房间，或从访客房间登录现有账号，会返回 409 `ROOM_ALREADY_JOINED`，应先退出当前房间。切到后台会暂停硬件，保留当前房间供返回。

错误格式为 `{ error: { code, message } }`，提示用英文。主要状态：400 输入错误，401 身份缺失 / 过期，403 Origin / CSRF / 创建者权限拒绝，404 场次或路由不存在，409 房间 / 宝藏变化或定位条件不满足，413 请求过大，415 内容类型错误，429 测试服务限额。不开放 CORS；POST 要求 JSON 与已允许的 Origin。HTTP 请求体上限 8192 字节；每场允许 16 位有效玩家；创建 / 加入按连接地址每分钟限制 20 次。局域网代理覆盖转发的客户端地址，后端仅监听回环并信任该本地代理；今后增加其他代理须保持此边界。

## 排行榜与图鉴

`GET /api/progress` 返回 `{ leaderboard, self, cards }`。榜单条目和 `self` 包含 `username`、`treasuresFound`、`cardsCollected` 和 `rank`。榜单按找到的宝箱数展示前十个有领取记录的账号，同分并列。首次得分前 `self.rank` 为 null。每张卡包含 `id`、`name`、`unlocked` 和 `story`，锁定时 `story` 为 null。访客访问会返回 401 `ACCOUNT_REQUIRED`。

已登录玩家每轮首次成功领取计一个宝箱，返回 `collection.reward: { name, unlocked }`，其中 `unlocked` 表示首次发现这张卡。在新轮次找到重复卡仍计一个宝箱，图鉴按不同卡片计数。每次成功放置都从图鉴的六张卡片中独立随机抽取，连续两轮可能抽到同一张。放置后，所有房间玩家收到同一个 `room.cardId`。房间没有宝藏时，该字段为 `null`。尚无卡片的旧放置使用 Campus Compass。账号进度与本轮领取凭据一同提交，解散房间及演示重置后仍能查看账号进度。累计从升级后的新领取开始。

## 前端适配与定位行为

前端使用 [RemoteTreasureSession](../public/treasure-lab/client.js)，不能将浏览器本地 `TreasureSession` 当成产品权威状态。适配器提供异步 `resume()`、`connect(name, code)`、`receive(fix)`、`place(radius)`、`aim(sample)`、`collect()`、`refresh()`；`start(now)` / `stop(now)` 对应硬件启停，`snapshot(now)` / `report(now)` 显示缓存的后端结果。当前控制器在前台每 2 秒轮询。网络错误暂停领取，停止后的迟到响应不能重新激活本地采集。相机生命周期仍在手机端，需保留权限、画面更新和后台停止判定。

账号使用 `authenticate('register' | 'login', username, password)` 和 `logout()`，界面显示 `account` 和当前玩法状态。`resume()` 先获取账号状态，再恢复游戏。CSRF 只放内存，Cookie 保持 HttpOnly，页面提交后立即清空密码框。退出房间、切换身份或登录过期时停止硬件。不要将密码或令牌写入 localStorage、报告或界面错误信息。

后端复用已测定位模型：初始半径 3 米，可设 3–100 米；精度门槛 20 米、退出缓冲 10 米、有效位置最长 15 秒、返回观察至少 2 秒且使用不同时间戳。均为实验参数。客户端坐标及 `cameraLive` 都是不可信上报，因此不构成防作弊或真实相机使用证明；后端可防止正常界面绕过流程和重复领奖，实际精度仍需走测。

## 持久化、隐私与 HTTPS

SQLite 保存账号、密码哈希、登录会话、访客身份、场次成员、共享宝藏坐标和收集凭据。表结构升级保留旧 ID 与凭据，运行服务升级前已备份私密数据库。每个浏览器会话只在后端内存保留最近位置与观察状态，不保存移动轨迹；停止后清空位置，重启丢失临时定位状态，收集凭据和共享点仍保留。私密存储被 Git 忽略。相机画面不离开手机；报告不自动包含坐标，手写备注分享前自行检查。

当前手机方案改为 [局域网 HTTPS 直连](lan-access.md)，不使用外部转发。电脑提供本地证书安装页与 HTTPS 代理，手机用户须亲自安装并信任开发证书后再测硬件。将 `PUBLIC_ORIGIN` 设为准确的 HTTPS 来源，无路径、无末尾斜线，后端仍使用端口 4180。手机信任与网络可达尚未确认。此前 Cloudflare Quick Tunnel 已被自动审批拒绝且保持关闭；今后如启用外部提供方，仍需明确许可其数据处理。

服务仅提供十一个公开静态文件及上述 API，不暴露仓库源码、私密存储或配置。当前是用户电脑上的开发服务，不是生产部署，也不是完整的正式多人产品。


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

换身份或房间前停止硬件并调用 `stop(now)`；主动开启真实浏览器定位 watch 后，以 `start(now)` / `receive(fix)` 对应其生命周期。停止时清除 watch 并调用 `stop(now)`，不存在 `/api/location/start` 接口。放置成功后使用新 `treasureId`，重新经历离开 / 返回。确认离开后 `snapshot(now).canNavigate` 可允许开启方向相机，进入范围后以 `aim(sample)` 上报新鲜瞄准读数。调用 `collect()` 前，调用者必须检查实时帧、本地当前瞄准及 `snapshot(now).canClaim`；适配器会发 `cameraLive: true`，但不能替调用者检查视频。成功后才能显示完成。在已连接 / 前台时用 `refresh()` 轮询，现有控制器每 2 s 轮询、每 500 ms 渲染；没有 WebSocket 或服务端推送。

## 适配器返回值与缓存

| 公开成员 | 契约 |
| --- | --- |
| `resume()` | 无返回载荷的 Promise，更新身份 / 房间或 `lastError`，不开启硬件 |
| `authenticate('register' \| 'login', username, password)` | `Promise<boolean>`。新登录从选房页开始，注册可关联当前访客房间 |
| `logout()` | `Promise<boolean>`。在房间内会发送当前房间信息，成功后清空本地账号与游戏状态 |
| `connect(name, code = '')` | `Promise<boolean>`，空码建房、非空码加入；账号使用服务端用户名 |
| `leaveRoom({ roomCode, treasureId })` | `Promise<boolean>`。成功后回到选房页，保留账号登录 |
| `resetDemo({ roomCode, treasureId })` | `Promise<boolean>`。仅房主可用的演示退出操作 |
| `progress()` | 返回 `/api/progress` 的 Promise。登录后可从选房页、房间菜单或领取结果进入 |
| `start(now)` / `stop(now)` | 同步对应本地生命周期；`stop` 将服务端停止排队，并非等待停止完成 |
| `receive(fix)` | `Promise<boolean>`；false 可能是跳过进行中读数、重复时间戳被拒绝或请求失败，结合 `lastError` |
| `aim(sample)` | `Promise<boolean>`，发送新瞄准读数或 null 清空，并发跳过返回 false；适配器不负责传感器采集 |
| `place(radius)` / `collect()` | `Promise<boolean>`，成功应用后端状态包，false 不能视为完成 |
| `refresh()` | 无返回载荷的 Promise，已连接且非忙碌 / 轮询中时更新游戏状态 |
| `snapshot(now)` | 缓存显示状态，加本地 active / online / 时效 / busy 门槛；按钮启用优先读它，不直接读 `data.state` |
| `report(now)` | 不自动含坐标的导出数据，附缓存房间 / 玩家 / 凭据 / 连接与客户端事件 |
| `account` | 当前账号或 null |
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
    "code": "0123",
    "treasureId": null,
    "placed": false,
    "radius": 3,
    "policy": "one-claim-per-player",
    "playerCount": 1
  },
  "player": { "id": "example-player", "name": "Explorer", "role": "owner" },
  "state": {
    "kind": "stopped",
    "distance": null,
    "phase": "unplaced",
    "eligible": false,
    "canNavigate": false,
    "guidance": null,
    "aim": { "ready": false, "heldMs": 0, "requiredMs": 700, "expiresInMs": 0 },
    "canClaim": false,
    "canPlace": false,
    "expiresInMs": 0
  },
  "report": {
    "config": { "radius": 3, "exitMargin": 10, "maxAccuracy": 20, "maxAge": 15000, "dwell": 2000 },
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

使用后端返回的原始 `treasureId`。新 `room.code` 为 `0000` 至 `9999` 的四位数字，以字符串保存前导零。加入时忽略空格和连字符，兼容已有八位码的大小写输入。访客昵称为去首尾空格后 1–32 字符且不含控制字符。位置纬度为 −90…90 的有限数，经度 −180…180，精度为非负有限数，时间戳为有限 Unix 时间。后端拒绝超过 15 s 或超前超过 5 s 的位置；重复 / 乱序时间戳可能 HTTP 200 且 `accepted: false`。HTTP 200 `accepted: true` 也不代表可领取，必须检查状态；超过 20 m 的精度可被记录，但不能解锁 / 放置。

`state.kind` 为 `stopped | waiting | stale | imprecise | unplaced | inside | outside | boundary`，`state.phase` 为 `unplaced | leave | return | ready | collected`。`eligible` 是定位资格，不证明相机实时。`expiresInMs` 是响应生成时服务端位置的剩余有效期，不可据此延长，适配器会在本地使缓存按钮过期。`canPlace` 已包括房主权限。停止或恢复的会话可以 `phase: collected`、`eligible: false` 且凭据非 null。

`receipt` 为 null 或 `{ id: string, collectedAt: number }`；`/api/collect` 另含 `collection: { id: string, collectedAt: number, repeated: boolean }`，`/api/location` 与 `/api/aim` 另含 `accepted: boolean`，其他游戏变更成功仅含同一基础状态包。`players` 是未过期成员，不是已验证在线状态；`player.role: 'guest'` 表示非房主，可能是已登录账号。`report.collectionCount` 为当前玩家 / 轮次 0 或 1，不是历史总数。`/api/auth/session` 的房间项 `{ code, role }` 没有背包或坐标。事件为 `{ at: ISO8601-string, event: string }`，仅诊断，不作为界面流程权威。成功游戏响应均不含原始经纬度。

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
| 409 `ROOM_ALREADY_JOINED` | 先退出当前房间，再打开其他房间或登录现有账号 |
| 409 `ROOM_CHANGED`、`TREASURE_CHANGED` | 刷新状态，丢弃旧假设，切房时停硬件并观察当前轮次 |
| 409 `LOCATION_REQUIRED`、`NOT_ELIGIBLE` | 保留定位 / 离开返回条件，说明下一步 |
| 409 `AIM_REQUIRED` | 禁用 Claim，取得新鲜姿态和视频，重新对准宝箱并完成停留 |
| 413 `BODY_TOO_LARGE` | 修正请求序列化，不发送图像 / 视频流或整个适配器 |
| 429 `RATE_LIMIT`、`AUTH_BUSY` | 暂停尝试，之后手动重试，目前不提供 `Retry-After` 值 |
| 429 `ACCOUNT_LIMIT`、`ROOM_LIMIT` | 测试服务容量已满，与后端负责人对接 |
| 404 `NOT_FOUND`、405 `METHOD_NOT_ALLOWED` | 检查文档路由 / 方法 |
| 500 `SERVER_ERROR`、超时 / 网络失败 | 禁止领取，显示服务恢复入口并谨慎重试 |

2026-11-03 已按 `server/app.mjs`、`server/store.mjs`、`server/index.mjs`、`public/treasure-lab/client.js` 和 `model.js` 核对本文。[前端交接](frontend-handoff.md) 列明修改范围与硬件验收边界。该基线已提交到本地 `main`（057b9d9），推送前远程克隆不包含它。

## AR 方向与瞄准契约（2026-11-04）

当前共有 15 个 API 路由、十一个静态文件；本轮新增 `ar.js` 与 `/api/aim`，数据库表结构不变。同源 Permissions-Policy 允许 accelerometer、gyroscope、magnetometer，但不代替设备授权。手动埋藏保留为测试工具，正式产品方向为系统生成或工作人员布置；后两者接口尚未实现。

`state.eligible` 仅表示确认离开 / 返回后的新鲜范围内定位，不包含瞄准。`canNavigate` 在确认离开、位置有效后允许方向相机，包含 outside 和 boundary；过期、精度不足、停止定位或断网均阻止导航，适配器还要求本地采集处于 active。`guidance` 为 null 或 `{ bearingDegrees, distanceMeters, mode: 'approach' | 'nearby' }`，角度从正北顺时针、距离单位米。该字段返回推导方位，不返回保存坐标。进入近处时锁定最近可靠的接近方位，减少近距离 GPS 摆动；确认重新处于 outside 后解除锁定。这是地平线附近的虚拟目标，不是测绘物理点锚定。重新放置及各玩家会话分别重置相关门槛。

`POST /api/aim` 保留 CSRF / room / 轮次校验，sample 格式如下（仅文档示例）：

```json
{
  "roomCode": "0123",
  "treasureId": "<current-round-id>",
  "sample": {
    "heading": 180, "pitch": 0, "timestamp": 1800000000000,
    "source": "webkit-compass", "accuracy": 5,
    "cameraLive": true, "videoAgeMs": 0
  }
}
```

`heading` 为后置相机视线方位 [0,360)，`pitch` 为仰角 [-90,90]，均为有限角度。`source` 只能是 `webkit-compass` 或 `absolute-orientation`；相对 alpha 与行进方向不够。`accuracy` 不可用时为 null / 缺省，否则为有限的 0–25 度。timestamp 是 Unix 毫秒，距服务端当前时间不能超过 1500 ms，也不能超前 5000 ms。`videoAgeMs` 为 0–750，`cameraLive` 必须 true。无效、偏离目标或 null 读数清空停留，通常返回 HTTP 200、`accepted: false`；重复 / 较旧时间戳不能推进停留。

后端按收到读数的时间计算至少 700 ms 的停留，要求至少三个不同时间戳，相邻间隔不超过 900 ms。后置相机视线总角误差包含方位和仰角，需保持在 18° 以内。室内瞄准时，估计水平位置离开始点超过 0.20 米会重新计时。停留时长以后端为准。`state.aim` 为 `{ ready, heldMs, requiredMs, expiresInMs }`；`canClaim` 还要求定位资格。适配器按位置和瞄准有效期使缓存过期。控制器每 250 ms 最多发送一次，不并发发送瞄准，并在 Claim 点击前独立检查本地停留和新鲜视频帧。仅渲染不能完成停留。这些是实验初值，不是已验收的实地性能。

从相机按钮的同一用户手势申请 Motion & Orientation，再等待相机获取。`ar.js` 将绝对姿态转换为后置相机射线，包含倾斜和屏幕旋转、跨正北平滑，采用近似水平 60 度虚拟视场。过期、精度不足或缺失指南针时提示恢复并禁止目标 / Claim。远处显示方向箭头，近处宝箱只有进入视野才出现，对准并停留后手动 Claim。停止 / 后台会清除传感器监听与本地 / 后端瞄准，并释放相机和定位。导出增加 AR 参数及状态，不自动含原始 heading、bearing 或坐标；相机画面不上传，瞄准读数发送电脑且仅临时保留。

客户端定位、姿态和视频时效仍是不可信交互信号，不构成防作弊或实际瞄准证明。投影不提供标定相机跟踪、楼层检测、道路路线、世界锚定或 SLAM。后置相机变换参考 [W3C 示例 A.1](https://www.w3.org/TR/orientation-event/#worked-example)，竖持 Safari 指南针对齐、漂移、磁场干扰和室外瞄准仍待用户实测。见 CQ-20261104-008 / E-20261104-007。

## GPS 恢复与向导更新

CQ-20261104-010 替代此前默认范围及失去定位自动关相机的行为。开启寻宝与领取默认均为 3 米，在此设置下按报告中心距离、不附加退出缓冲 / 误差圈；更大半径保留保守规则。旧未标记存储点一次性迁移，不删除坐标、轮次或领取结果，实际迁移前已有私密备份。GPS 不保证实际 3 米精度。

暂时失去 GPS 会暂停目标 / Claim，但保留已开启的相机和姿态，箭头变为重连转圈，并约每十秒重新建立定位 watch。主动停止、后台及权限撤销仍释放硬件。适配器新增 `loseLocation(now)`，使旧响应失效、清后端位置但不关闭本地采集；新接受位置清除中断标记。相机尚未真正取得视频流前若定位无效，仍取消这次获取。

全局向导使用独立响应，进房前也能提问。房间请求仍校验成员身份和当前轮次。教程 ID、访客 CSRF、超时和内容设置见 [向导契约](ai-guide.md)。

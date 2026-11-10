# 游戏向导与操作教程

[English](ai-guide.en.md) · 更新于 2026-11-11 · CQ-20261111-015

首页、房间、相机和游戏面板都可使用左上角的 **Tutorials** 和旁边的聊天按钮。访客加入房间前也能提问。六条英文教程涵盖创建房间、加入房间、启用 Indoor、藏宝和领取、查看排行榜及查看图鉴。进度教程会引导访客打开账号入口，已登录玩家则直接进入对应标签。教程压暗背景，用箭头指向当前步骤的真实控件。按钮操作和轮次重置由玩家亲自确认。

教程列表滑入后，选项依次出现。开始教程时，箭头从屏幕可见区域的中央飞向第一个控件，到位后黄框和说明淡入。操作高亮的控件推进时，旧黄框和说明先淡出，箭头再飞往下一个控件，到位后显示新提示。关闭教程时，遮罩和提示卡一起淡出。

问题与教程匹配时，向导先在聊天里解释步骤，再推荐教程。游戏校验教程 ID 和玩家角色后，在回复下方显示 **Open tutorial** 和 **Not now**。打开教程时，聊天淡出，箭头按同样的顺序引导。点 **Not now** 会收起邀请并留在对话中。

从聊天打开教程后，点 **Close** 或 **Done** 会淡出教程并滑回聊天窗口。回来后可以继续查看当前对话、编辑草稿。点输入框才会弹出键盘。开启「减少动态效果」时，打开和返回都直接切换。

电脑后端计算距离并匹配已配置楼栋。相机仍显示主动距离和 GPS 通知，也保留 **How far?**、**This building** 和 **Courses here**。在 AR 内打开对话会清除瞄准，相机继续运行。同一会话跨页面保留消息。首次进房保留入门对话，后续房间或轮次变化会清除上一轮寻宝上下文。

## 私密启用 DeepSeek

替换 Key 已写入私密 `.env`（600）；认证及一次真实向导回答均通过 HTTP 200，服务已重启加载（CQ-20261104-012）。连接器已通过隔离样本和一次真实向导回答；全面质量、延迟和额度仍未验证。未配置 Key 时面板明确显示 **Preset guide · AI not connected**。真实距离回答和已配置预设不需要 Key；建筑资料缺失会直接说明，不编造。

1. 将根目录 `.env.example` 复制为 `.env`，保持 Git 忽略、权限 600，在本地填写 `DEEPSEEK_API_KEY`。不要把 Key 放进聊天、页面、Git、网址或截图。
2. 必要时将 `CQ_AI_BASE_URL`、`CQ_AI_MODEL` 改为课程服务地址 / 模型。当前默认 `https://api.deepseek.com`、`deepseek-flash` 来自官方文档，不代表课程权限已经验证。只接受可信 HTTPS 地址。后端从 `.env` 读取向导设置，不覆盖启动器网络配置。
3. 运行 `./start.sh restart`。Key / 地址 / 模型变化需重启；`./start.sh status` 检查游戏服务，不验证模型权限或余额。

提供方请求包含玩家文字 / 有限对话、近似宝藏距离、已匹配的整理建筑 / 课程资料，不自动包含相机帧、原始 GPS 坐标、账号凭据、姓名、房间 ID 或会话令牌。玩家自行输入的文字可能含私密信息，面板说明了对外文字流向。视频留在手机，不使用语音 / 图像 / 第三方地图服务。

## 添加角色、预设和校园内容

编辑 [server/guide-config.json](../server/guide-config.json)，或在 `.env` 设置 `CQ_GUIDE_CONFIG=.local/guide-content.json` 使用私密覆盖。当前导入用户 v0.1 文档：Campus Quest Guide 角色、13 条知识（校区、四栋建筑、八个专业）、17 条来源及三条 FAQ。**`places` 仍为空**，因为没有提供已审核的 GPS 几何；来源核验保留用户文档的表述，本轮未独立重查。每次向导请求会校验、重新读取内容；有效内容变化会重置对话上下文。格式错误返回 `GUIDE_CONFIG_INVALID`，不生成虚假资料；私密覆盖仍被 Git 忽略。

| 字段 | 内容 / 限制 |
| --- | --- |
| `name` | 向导显示名，1–60 字符 |
| `role` | 英文角色 / 语气 / 行为设定，1–12000 字符；固定系统约束仍禁止编造建筑、课程、相机观察和修改游戏 |
| `presets` | 必需英文模板 `welcome`、`distance`、`gpsLost`、`gpsRestored`、`unknownPlace`、`arrival`、`providerUnavailable`，每项 1–1000 字符 |
| 模板变量 | `{distance}`、`{distanceLabel}`、`{place}`、`{description}`、`{courses}`，由后端上下文替换 |
| `faq` | 最多 100 项 `{ questions: [英文问法变体], answer: 英文确认回答 }`，规范化精确匹配会将确认回复作为模型依据；未配置 Key 时使用预设 |
| `places` | 最多 200 个核实区域，逐项含唯一 `id`、`name`、`description`、数值 `latitude` / `longitude`、单位米的数值 `radius` 和 `courses` 数组 |
| `courses` | 每地点最多 30 项 `{ name, description }`，填写已核实的课程介绍，不推断教学安排 |

仅填写核实的公开校园点位，不填写玩家私密实时位置。仅当新鲜、精度达标的位置及其报告误差圆完整处于唯一配置区域时匹配建筑。重叠不明确、无资料、过期或精度不足时不提供建筑上下文。GPS 只能识别附近配置区域，不证明相机面对哪个物体、楼层或房间。模型必须承认资料缺失；已配置 Key 时，未知建筑 / 课程问题仍交模型处理，上下文地点为空，要求询问楼名，不能推断当前位置。

## API 与失败处理

向导响应独立于游戏状态包。已登录账号和房间访客可复用既有 CSRF 令牌。未进房的匿名访客首次 GET 会收到 HttpOnly 的 `cq_guide` Cookie 及配套的向导 CSRF 令牌。

| 路由 | 契约 |
| --- | --- |
| `GET /api/guide` | 返回 `name`、`providerConfigured`、`context`、`messages`、`csrfToken`、`status` 和 `providerError`。读取向导时无需调用模型。 |
| `POST /api/guide` | 使用 Origin、JSON、`X-CSRF-Token`，在 `message`（去空白后 1–500 字符）和 `event`（`distance`、`arrival`、`gps-lost`、`gps-restored`）中任选其一。可附带 `entry`、`menu` 或 `camera` 等支持的 `page`。房间内请求还要附带 `roomCode` 和当前 `treasureId`。 |
| POST 结果 | 返回向导状态和 `accepted`，已接受的回复还返回 `tutorialId` 或 `null`。不适用或重复的事件返回 `accepted: false`。 |
| 上下文 | 含 `roomRole`（`host`、`guest` 或 `null`）、定位模式、GPS 状态、近似距离、匹配地点及当前轮次。未进房时定位、距离、地点和轮次为空。 |
| 消息 | 每份对话最多 24 项，含 `id`、`role`、`text`、`source`、`kind`、`at` 及可选 `failureCode`。客户端按纯文本展示。 |

`RemoteTreasureSession.guideRequest(body?, signal?)` 与定位和瞄准请求分开。模型、客户端及局域网代理超时分别为 20、25 和 30 秒。后端每个向导身份每分钟最多 20 次 POST，未进房的匿名访客每 IP 每分钟最多八次。模型全局最多两个并发，同一对话最多一个。到楼和 GPS 事件冷却 60 秒，距离冷却 30 秒。内存最多保留 256 份对话，闲置 30 分钟后清理。

配置 Key 后，手动提问和相机快捷提问发给 DeepSeek。请求提供当前页面、可用教程、近似寻宝状态和筛选后的资料。连接器读取 JSON `{ reply, tutorialId? }`，输出上限为 400 token。当前手动提问返回有效的教程 ID 时，客户端可以发出邀请，由玩家在聊天里确认。GET 轮询不会发出邀请。欢迎语、距离和 GPS 通知用模板，室内距离使用运动估算。模型失败时返回带安全错误代码和 `status: degraded` 的预设提示。

页面值不支持时返回 `INVALID_GUIDE_PAGE`，访客会话缺失返回 `GUIDE_SESSION_REQUIRED`，并发返回 `GUIDE_BUSY`，上下文过期返回 `GUIDE_CONTEXT_CHANGED`。Origin、CSRF 和当前房间校验继续生效。共享内容文件、`.env` 和私密存储均在静态白名单之外。

## 3 米模式与 GPS 恢复

默认**开启寻宝与领取均为 3 米**，按系统报告的中心距离判断：大于 3 米算离开，不超过 3 米算进入，不再附加 10 米退出缓冲或误差圈。仍要求位置新鲜、报告精度不超过 20 米，并保留稳定返回 / 实时帧 / 瞄准门槛。这样能做短距离测试，但不保证实际 3 米精度，GPS 漂移可能误触发或漏触发。可选其他半径 4–100 米继续使用基于不确定性的判定。旧存储点位一次性迁移到 3 米并加版本标记，保留坐标、轮次 ID 和领取结果；实际数据库应用前已私密备份。

相机开启后，暂时超时、不可用、精度不足或位置过期均保留画面，箭头变为转圈及 **GPS signal lost. Reconnecting…**，宝箱 / Claim 暂停。保持既有 watch，恢复期间约每十秒重新建立 watch；新位置到达后恢复方向，无需再次申请相机，仍须重新完成瞄准。权限撤销、主动停止、后台、身份变化或新轮次仍释放硬件，不提供后台定位。

验证：80 项自动化、安装 / 构建、隔离真实 HTTP、可信局域网 TLS 和运行数据保留通过。模型样本与隔离布局预览不是实际 DeepSeek 调用或 Safari 验收；室外 GPS、方向稳定、Safari 键盘 / 恢复和真实模型回答待测。见 [E-20261104-008](../progress/zh-CN/evidence/README.md)。

2026-11-04 核对的主要来源：[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)。

## 已导入 v0.1 预设

CQ-20261104-011 导入 `Campus_Quest_AI_导览预设_v0.1_2026-11-04.md`。第 5 节英文角色用于现有 `{ reply }` 接口契约。`knowledge` 逐项含 `id`、`aliases`、`text`、`sourceIds`、`relatedIds`，`sources` 按来源 ID 保存归属网址。按明确点名的建筑 / 学科检索相关专业，有限话题记忆支持无 GPS 时继续追问课程；允许一般学科解释，但点名知识不意味着玩家在该处。排除旧地图待确认用途和未审核围栏；距离采用应用产生的近似标签，3 米附近不用小数营造精度；复合距离 / 课程问题可交模型处理。Key 值及无关 Softr 字段不作为内容导入。

官方地址认证返回 401，补前缀格式检查也未成功，未保存该变体；原提供 Key 保持私密，不声称有真实生成回答或模型验收。用户确认需要更换有效 Key。80 项测试与构建通过，服务已重启且健康，见 E-20261104-009。

CQ-20261104-012 已解除此前 401 阻碍：替换 Key 认证、可用模型发现（`deepseek-flash`）及一次真实 C 栋 / 示例课程回答通过；未使用 GPS 或相机数据，手机表现仍待验证。

## 提供方失败诊断

CQ-20261104-015：区分 `AI_TIMEOUT`、`AI_NETWORK`、`AI_AUTH`、`AI_RATE_LIMIT`、`AI_UPSTREAM`、`AI_REPLY_TOO_LARGE`、`AI_REPLY_INCOMPLETE`、`AI_REPLY_INVALID`。标题显示可读原因，失败回答保留 `failureCode`，后台轮询不会把该次失败重标为模型已启用 / 成功；后续成功回答解除 degraded。后端仅向已有私密日志写入 `{ event, code, upstreamStatus, elapsedMs }`，不记录提问、回复、原始错误、身份、坐标或凭据。旧失败没有日志，无法追溯：用户截图确认了备用回复，但没有记录当时具体原因。C 栋点名检索和真实重试成功，不代表提供方持续稳定或手机验收；没有添加自动付费重试。

室内 RoNIN 返回 `context.positionMode` 为 `indoor-ronin`，以及 `gps: not-used`、`place: null`。`distanceLabel` 标明距离来自 RoNIN 估算。室内流程抑制 GPS 和到楼主动提示。[室内契约](indoor-demo.md)

CQ-20261111-007 将历史成功回复统一为 JSON，并从模型上下文移除预设通知和失败回复。收到 HTTP 200 且已完成的回复正文只有空白时，用较短的历史重试一次，两次共用原有 20 秒期限。第二次仍为空时标记 `AI_REPLY_EMPTY`。格式无效的回复使用独立的无法读取提示。[DeepSeek JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)

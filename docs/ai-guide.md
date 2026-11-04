# 相机向导与内容配置

[English](ai-guide.en.md) · 更新：2026-11-04 · CQ-20261104-010

AR 相机内新增 **Chat with guide**、消息预览、英文文字对话，以及 **How far?**、**This building**、**Courses here** 快捷提问。本轮没有加入语音、图像识别或解谜领取门槛。阅读 / 输入时相机继续运行，打开对话会清除瞄准并隐藏 Claim，关闭后重新瞄准领取。关闭相机、后台、身份 / 房间 / 轮次变化取消迟到界面请求。利用 visual viewport 避让键盘，真实 iPhone 键盘表现仍待验证。

电脑后端计算距离、匹配已知建筑，模型不能修改玩法、目标坐标或领取凭据。主动消息用于介绍新进入的配置建筑 / 课程、通知 GPS 丢失 / 恢复，以及对话关闭时约每 30 秒报告距离。控制器每五秒读取向导上下文，打开对话后暂停主动打断；后端冷却防止每次渲染反复讲解。

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
| `faq` | 最多 100 项 `{ questions: [英文问法变体], answer: 英文确认回答 }`，规范化精确匹配优先使用确认回复，不经过模型 |
| `places` | 最多 200 个核实区域，逐项含唯一 `id`、`name`、`description`、数值 `latitude` / `longitude`、单位米的数值 `radius` 和 `courses` 数组 |
| `courses` | 每地点最多 30 项 `{ name, description }`，填写已核实的课程介绍，不推断教学安排 |

仅填写核实的公开校园点位，不填写玩家私密实时位置。仅当新鲜、精度达标的位置及其报告误差圆完整处于唯一配置区域时匹配建筑。重叠不明确、无资料、过期或精度不足时不提供建筑上下文。GPS 只能识别附近配置区域，不证明相机面对哪个物体、楼层或房间。模型必须承认资料缺失；明确询问未知建筑 / 课程时，即使已配置模型，也直接使用未知地点预设。

## API 与失败处理

两个路由复用现有认证房间身份，向导响应独立于游戏状态包。向导失败不会把游戏连接标为断线，也不会阻塞游戏请求队列。

| 路由 | 契约 |
| --- | --- |
| `GET /api/guide` | `{ name, providerConfigured, context, messages }`，不申请硬件或调用模型 |
| `POST /api/guide` | 使用既有 `X-CSRF-Token`、Origin / JSON、`roomCode` 和当前 `treasureId`；发送 `message`（去空白后 1–500 字符）或 `event`（`distance`、`arrival`、`gps-lost`、`gps-restored`）二选一 |
| POST 结果 | 同一向导状态及 `accepted`，接受时另含 `status: ready | degraded`；去重 / 不适用事件返回 `accepted: false` |
| `context` | `{ gps: available | lost | paused, distanceMeters: number | null, place: null | { id, name, description, courses }, knowledgeReady, roundId }`，无原始坐标 |
| `messages` | 最多 24 项 `{ id, role: user | assistant, text, source: player | preset | deepseek, kind, at }`，按文本渲染；按登录 / 访客会话、房间 / 轮次隔离 |

`RemoteTreasureSession.guideRequest(body?, signal?)` 返回向导结果，过期工作返回 null。先等已经排队的 GPS 失效请求，再独立发送，慢模型不阻塞定位 / 瞄准。客户端 12 秒超时、模型 8 秒超时；后端每玩家每分钟最多 20 次 POST，全局最多两个模型并发；同一对话并发返回 429 `GUIDE_BUSY`。建筑 / GPS 事件冷却 60 秒，距离 30 秒。对话仅存内存，最多 256 份、惰性清理 30 分钟未活动项；重启 / 轮次 / 内容变化重置，无持久聊天表。

距离、GPS 提示和精确 FAQ 使用预设；已配置 DeepSeek 时，其余适用问题 / 建筑主动介绍调用模型。使用 `/chat/completions`、JSON `{ reply }`、400 token 输出限制和有限上下文，不向界面暴露原始提供方错误。空白、格式不合法、超大、未完整、超时或失败响应明确变为预设失败（`status: degraded`、`source: preset`）并提示重试。模型输出仍不可信，JSON 格式不等于语义验证；旧轮次、地点或 GPS 上下文的回复会被拒绝，领取校验保持独立。

错误包括 400 `INVALID_GUIDE_MESSAGE` / `INVALID_GUIDE_EVENT`、409 `GUIDE_CONTEXT_CHANGED`、429 `GUIDE_BUSY` / `RATE_LIMIT`、503 `GUIDE_CONFIG_INVALID`，以及既有身份 / CSRF / 房间 / 轮次错误。接口不接受客户端提供的角色、建筑事实、坐标或 Key 作为模型上下文。共享配置、`.env` 和私密存储不在静态白名单。

## 3 米模式与 GPS 恢复

默认**开启寻宝与领取均为 3 米**，按系统报告的中心距离判断：大于 3 米算离开，不超过 3 米算进入，不再附加 10 米退出缓冲或误差圈。仍要求位置新鲜、报告精度不超过 20 米，并保留稳定返回 / 实时帧 / 瞄准门槛。这样能做短距离测试，但不保证实际 3 米精度，GPS 漂移可能误触发或漏触发。可选其他半径 4–100 米继续使用基于不确定性的判定。旧存储点位一次性迁移到 3 米并加版本标记，保留坐标、轮次 ID 和领取结果；实际数据库应用前已私密备份。

相机开启后，暂时超时、不可用、精度不足或位置过期均保留画面，箭头变为转圈及 **GPS signal lost. Reconnecting…**，宝箱 / Claim 暂停。保持既有 watch，恢复期间约每十秒重新建立 watch；新位置到达后恢复方向，无需再次申请相机，仍须重新完成瞄准。权限撤销、主动停止、后台、身份变化或新轮次仍释放硬件，不提供后台定位。

验证：80 项自动化、安装 / 构建、隔离真实 HTTP、可信局域网 TLS 和运行数据保留通过。模型样本与隔离布局预览不是实际 DeepSeek 调用或 Safari 验收；室外 GPS、方向稳定、Safari 键盘 / 恢复和真实模型回答待测。见 [E-20261104-008](../progress/zh-CN/evidence/README.md)。

2026-11-04 核对的主要来源：[DeepSeek Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/)、[JSON 输出](https://api-docs.deepseek.com/guides/json_mode/)。

## 已导入 v0.1 预设

CQ-20261104-011 导入 `Campus_Quest_AI_导览预设_v0.1_2026-11-04.md`。第 5 节英文角色用于现有 `{ reply }` 接口契约。`knowledge` 逐项含 `id`、`aliases`、`text`、`sourceIds`、`relatedIds`，`sources` 按来源 ID 保存归属网址。按明确点名的建筑 / 学科检索相关专业，有限话题记忆支持无 GPS 时继续追问课程；允许一般学科解释，但点名知识不意味着玩家在该处。排除旧地图待确认用途和未审核围栏；距离采用应用产生的近似标签，3 米附近不用小数营造精度；复合距离 / 课程问题可交模型处理。Key 值及无关 Softr 字段不作为内容导入。

官方地址认证返回 401，补前缀格式检查也未成功，未保存该变体；原提供 Key 保持私密，不声称有真实生成回答或模型验收。用户确认需要更换有效 Key。80 项测试与构建通过，服务已重启且健康，见 E-20261104-009。

CQ-20261104-012 已解除此前 401 阻碍：替换 Key 认证、可用模型发现（`deepseek-flash`）及一次真实 C 栋 / 示例课程回答通过；未使用 GPS 或相机数据，手机表现仍待验证。

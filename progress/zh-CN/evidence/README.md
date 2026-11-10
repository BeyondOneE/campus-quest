[English](../../en/evidence/README.md)

# 证据索引

共享机器索引：[evidence-index.json](../../evidence/evidence-index.json)。原件只保留一份，下面的 ID 在中英文中保持一致。

| ID | 来源 / 留存 | 可支持的结论与限制 |
| --- | --- | --- |
| E-20261028-001 | 用户导出的 Brave 报告，原件位于仓库根目录被忽略的 `campus-quest-safari-2026-10-28T09-45-14-625Z.json`，已重新核对 hash | 支持 [脱敏实测审阅](../../../docs/2026-10-28-device-check-review.md)；用户确认使用 Brave，不能算 Safari 验收 |
| E-20261028-002 | Git 实现提交 `19c4224`、`e59b370`、`bb1463a` | 证明原型来源、诊断功能与识别修复的代码历史；不单独证明个人贡献、真机通过或课程提交 |
| E-20261103-001 | 两份课程 Final3 PDF，原件在课程工作区 `docs/`，hash 见索引 | 支持 [课程要求映射](../course-requirements.md)，不是课程平台回执 |
| E-20261103-002 | [本轮文档一致性检查](../../evidence/2026-11-03/document-checks.json) | 双语配对、记录 ID / hash / 提交引用、数字及相对链接核对；不是代码或手机测试 |
| E-20261103-003 | [定位寻宝验证摘要](../../evidence/2026-11-03/treasure-lab-checks.json) 与 [英文初始页截图](../../evidence/2026-11-03/treasure-lab-desktop-en.png) | 28 项逻辑测试、安装与构建、HTTP 服务和英文桌面布局通过；截图无真实相机或位置，不构成 Safari 走测通过 |
| E-20261103-004 | [共享后端检查摘要](../../evidence/2026-11-03/backend-checks.json) 与 [英文后端连接截图](../../evidence/2026-11-03/backend-desktop-en.png) | 38 项测试、真实 HTTP 双会话、浏览器身份与重启恢复、本地安装及构建通过；未申请设备定位，相机未开启，HTTPS 转发被自动审批拒绝，尚无手机链接或现场验收 |
| E-20261103-005 | [局域网 HTTPS 检查摘要](../../evidence/2026-11-03/lan-checks.json) | 39 项测试、电脑侧 TLS / IP、HTTPS 双会话、Secure Cookie 和私密路径检查通过；未改设备信任、未测手机可达或现场定位，相机未开启 |
| E-20261103-006 | [用户提供的相机锁定截图](../../evidence/2026-11-03/camera-locked-user.png)，原件未编辑，哈希见索引 | 显示 Locked、禁用按钮、离开 / 返回提示及 Not Secure；完整 URL、证书信任与相机权限状态不可见，没有实时相机画面 |
| E-20261103-007 | [账号检查摘要](../../evidence/2026-11-03/account-checks.json) 与 [英文账号桌面截图](../../evidence/2026-11-03/account-desktop-en.png) | 48 项测试、升级 / 重启、跨设备身份 / 凭据、隔离浏览器注册 / 登录 / 退出 / 刷新及 320 / 390 像素检查通过。私密备份后更新运行局域网 TLS 入口，保留原数据条数；没有真实用户凭据、手机登录、定位或相机验收 |
| E-20261103-008 | [前端交接检查摘要](../../evidence/2026-11-03/frontend-handoff-checks.json) | 纯文档源码 / 路由核对，12 个 API 路由、两份响应示例内存结构比较、48 元素 DOM 契约及双语文档 / 本地链接检查；未重跑产品测试 / 构建，未改版界面、运行 Claude 或进行真机验收 |
| E-20261104-001 | [检查摘要](../../evidence/2026-11-04/frontend-redesign-checks.json)、[入口](../../evidence/2026-11-04/redesign-entry-390-desktop.jpg)、[放置](../../evidence/2026-11-04/redesign-place-390-desktop.jpg)、[菜单](../../evidence/2026-11-04/redesign-menu-390-desktop.jpg)、[320 宽度](../../evidence/2026-11-04/redesign-move-320-desktop.jpg) | 49 项测试、构建及隔离后端上的桌面分屏检查通过；定位和相机是测试标签页内替换的模拟输入，截图来自桌面应用浏览器窗格。不代表 iPhone Safari、真实定位 / 相机或键盘 / 工具栏表现 |
| E-20261104-002 | [检查摘要](../../evidence/2026-11-04/visual-motion-checks.json)、[入口](../../evidence/2026-11-04/visual-entry-390-desktop.jpg)、[放置](../../evidence/2026-11-04/visual-place-390-desktop.jpg)、[可开相机](../../evidence/2026-11-04/visual-ready-390-desktop.jpg)、[模拟相机](../../evidence/2026-11-04/visual-camera-simulated-390-desktop.jpg)、[已领取](../../evidence/2026-11-04/visual-claimed-390-desktop.jpg)、[320 宽度](../../evidence/2026-11-04/visual-claimed-320-desktop.jpg) | 49 项测试、构建及隔离后端上的桌面走查通过；定位和相机是测试标签页内替换的模拟输入，截图为桌面应用浏览器窗格的静态画面。窗格曾处于隐藏状态，未测量动画流畅度。不代表 iPhone Safari、真实定位 / 相机、键盘 / 工具栏、动画性能或评分者反应；iOS 字体在桌面截图中为替代字体 |
| E-20261104-003 | [检查摘要](../../evidence/2026-11-04/calm-pass-checks.json)、[入口](../../evidence/2026-11-04/calm-entry-390-desktop.jpg)、[放置](../../evidence/2026-11-04/calm-place-390-desktop.jpg)、[离开](../../evidence/2026-11-04/calm-leave-390-desktop.jpg)、[模拟相机](../../evidence/2026-11-04/calm-camera-simulated-390-desktop.jpg)、[已领取](../../evidence/2026-11-04/calm-claimed-390-desktop.jpg)、[320 宽度](../../evidence/2026-11-04/calm-claimed-320-desktop.jpg) | 50 项测试和构建通过。桌面上复现菜单抽动（页面容器被滚动 496 px），修复后打开和关闭期间滚动量为 0。定位和相机是测试标签页内的模拟输入；最后的月亮和太阳位置微调后只重拍了 390 宽度的已领取画面。不代表用户 iPhone 上抽动已消失，也不代表 iPhone Safari、动画性能或评分者反应 |
| E-20261104-004 | [检查摘要](../../evidence/2026-11-04/forest-checks.json)、[入口](../../evidence/2026-11-04/forest-entry-390-desktop.jpg)、[返回](../../evidence/2026-11-04/forest-return-390-desktop.jpg)、[已领取](../../evidence/2026-11-04/forest-claimed-390-desktop.jpg) | 50 项测试、构建及隔离后端上的桌面走查通过；定位和相机是测试标签页内的模拟输入，部分静态画面前快进了入场动画。未测量雾气和动画流畅度。不代表 iPhone Safari、动画性能或评分者反应 |
| E-20261104-005 | [Codex 前端检查](../../evidence/2026-11-04/codex-review-checks.json) | 独立重跑 50 项测试 / 构建通过，检查已提交源码及已有截图，只读检查 390 × 780 入口，隔离复现过期账号 / 访客恢复问题；未改产品、写运行数据、模拟设备 API、进行手机验收或测性能 |
| E-20261104-006 | [一键服务检查](../../evidence/2026-11-04/service-launcher-checks.json) | 51 项 Node 测试含七项隔离启动器检查，安装 / 构建 / 语法及实际后台启动 / 重复 / 状态、可信 TLS、运行数据汇总与 CA 保留通过；无手机信任、硬件或现场验收 |
| E-20261104-007 | [AR 方向 / 领取检查](../../evidence/2026-11-04/ar-guidance-checks.json) | 62 项自动化、安装 / 构建、隔离真实 HTTP 瞄准 / Claim / 重试、320 / 390 px 只读入口、实际后端重启 / 可信局域网 TLS / 数据与 CA 保留；无 Safari AR 真机验收 |
| E-20261104-008 | [相机向导 / GPS 检查](../../evidence/2026-11-04/camera-guide-checks.json) | 77 项测试 / 安装 / 构建、隔离模型样本与真实 HTTP、私密备份 / 保留数据的 3 米迁移、可信局域网 HTTPS、明确标注的桌面组件 / 入口检查；未配 Key，无真实模型调用或 Safari 真机验收 |
| E-20261104-009 | [预设 / API 接入](../../evidence/2026-11-04/preset-integration-checks.json) | 80 项测试 / 构建、角色与有限知识检索、私密凭据配置及服务重启通过；DeepSeek 返回 401，用户确认需换有效 Key，无真实回答或手机验收 |
| E-20261104-010 | [替换 Key 真实检查](../../evidence/2026-11-04/replacement-key-checks.json) | 认证 / 一次真实向导回答 HTTP 200，私密配置与重启 / 健康通过；本次无新源码测试或硬件验收 |
| E-20261104-011 | [向导稳定性检查](../../evidence/2026-11-04/guide-reliability-checks.json) | 83 项测试 / 构建、安全诊断 / 轮询保留失败及两次隔离真实模型回答通过；原截图失败原因不可用，不代表提供方持续稳定或真机验收 |
| E-20261105-001 | [近场检查](../../evidence/2026-11-05/near-field-checks.json) | 90 项测试 / 构建、隔离运动 / GPS 丢失 / 真实 HTTP 领取、数据 / CA 保留及可信局域网部署通过；输入为合成样本，没有 Safari 现场验收 |
| E-20261105-002 | [室内检查](../../evidence/2026-11-05/indoor-mode-checks.json)、[隔离桌面菜单](../../evidence/2026-11-05/indoor-mode-menu-desktop.jpg) | 99 项测试 / 构建、合成无 GPS 全流程、390 / 320 宽真实桌面菜单切换 / 刷新、迁移 / 数据 / CA 保留及可信局域网部署；不代表真机验收 |
| E-20261110-001 | [平面积分检查](../../evidence/2026-11-10/planar-integration-checks.json) | 102 项测试和构建、受控运动样本、隔离桌面菜单和刷新、电脑端可信局域网 HTTPS。待 iPhone Safari 真机测试 |
| E-20261110-002 | [地面指路检查](../../evidence/2026-11-10/floor-guidance-checks.json) | 102 项测试和构建、受控地面箭头、接近距离和宝箱瞄准，以及局域网 HTTPS 提供更新脚本。待手机复测 |
| E-20261110-003 | [雷达检查](../../evidence/2026-11-10/radar-checks.json) | 103 项测试和构建、受控晃动暂停和雷达流程、两种桌面布局尺寸及可信局域网重启。待手机复测 |
| E-20261110-004 | [停稳修正与五米雷达](../../evidence/2026-11-10/stop-correction-radar-checks.json) | 104 项测试和构建、闭合轨迹回放、雷达圆点和边缘箭头、可信局域网重启。手机精度待测 |
| E-20261110-005 | [运动录制与回放检查](../../evidence/2026-11-10/motion-recording-checks.json) | 107 项测试和构建、两种桌面尺寸、可信局域网 HTTPS 及使用官方权重的两组受控 CPU 回放。iPhone 录制及实测误差对比待完成 |
| E-20261110-006 | [iPhone 运动对照](../../evidence/2026-11-10/iphone-motion-comparison.json) | 两份用户录制分别用原输入和修正输入回放。记录移动、停稳标记误差及最后回点标记时手机仍在转动。游戏 AR 验收待完成 |
| E-20261110-007 | [RoNIN 玩法检查](../../evidence/2026-11-10/ronin-game-checks.json) | 111 项测试和构建、使用官方权重以原节奏进行两份 HTTP 回放、两种桌面宽度及可信局域网更新。瞄准领取用受控样本，iPhone AR 真机验收待完成 |
| E-20261110-008 | [RoNIN 瞄准与雷达检查](../../evidence/2026-11-10/ronin-aim-radar-checks.json) | 用户报告旧版已成功领取。111 项测试、构建、往返录制回放、受控浏览器标记及可信局域网更新通过。新版手机表现待复测 |
| E-20261110-009 | [RoNIN 停稳检查](../../evidence/2026-11-10/ronin-stop-checks.json) | 112 项测试、构建、两份录制回放及停稳段受控残余速度测试通过。可信局域网已提供更新，待手机复测 |
| E-20261110-010 | [GPS 和 RoNIN 模式检查](../../evidence/2026-11-10/two-mode-checks.json) | 107 项测试和构建、两种手机宽度的桌面检查、录制离线回放及可信局域网升级迁移一个房间。精简版待单独手机检查 |
| E-20261110-011 | [房间与相机交互检查](../../evidence/2026-11-10/interaction-checks.json) | 110 项测试和构建、隔离数据库的桌面进房与模式检查、三个局域网 HTTPS 文件一致。待 iPhone 真机检查键盘与相机 |
| E-20261110-012 | [演示重置检查](../../evidence/2026-11-10/demo-reset-checks.json) | 112 项测试和构建、隔离 HTTP 和桌面重置及返回首页检查、可信局域网服务验证。iPhone 待测 |
| E-20261110-013 | [调试入口检查](../../evidence/2026-11-10/test-tools-checks.json) | 113 项测试和构建、两种模式的菜单与工具桌面检查、更新页及独立工具页的 HTTPS 检查。iPhone 待测 |
| E-20261110-014 | [四位房间号与瞄准检查](../../evidence/2026-11-10/short-code-aim-checks.json) | 113 项测试和构建、房间与模式桌面检查、可信局域网验证。iPhone 瞄准待测 |
| E-20261110-015 | [相机宝箱素材检查](../../evidence/2026-11-10/camera-chest-art-checks.json) | 试作期间单独渲染 SVG、核对 146 个 DOM 元素、113 项测试和构建通过，可信局域网 HTTPS 页面一致。根据用户反馈恢复原版 |
| E-20261110-016 | [退出房间检查](../../evidence/2026-11-10/room-exit-checks.json) | 116 项测试和构建、两种手机宽度的独立桌面会话及可信局域网更新。iPhone 待测 |
| E-20261110-017 | [相机叠层检查](../../evidence/2026-11-10/ar-overlay-paint-checks.json) | 117 项测试和构建、受控绘制与传感器回调、局域网文件一致。iPhone 刷新节奏待测 |
| E-20261110-018 | [运动权限检查](../../evidence/2026-11-10/motion-permission-checks.json) | 118 项测试和构建、权限结果样本、桌面换行和可信局域网检查。手机结果待测 |
| E-20261111-001 | [排行榜和图鉴检查](../../evidence/2026-11-11/treasure-progress-checks.json) | 119 项测试和构建、领取与 SQLite 样本、两种桌面宽度及可信局域网升级。手机待测 |
| E-20261111-002 | [宝箱样式检查](../../evidence/2026-11-11/chest-variant-checks.json) | 119 项测试和构建、受控随机抽取、SVG 渲染、两种桌面宽度及可信局域网升级。手机待测 |
| E-20261111-003 | [AI 导览核对](../../evidence/2026-11-11/guide-audit-checks.json) | 21 项测试、局域网服务检查、一次隔离 DeepSeek 回复及室内距离文案错误复现。手机操作未测 |
| E-20261111-004 | [全局向导检查](../../evidence/2026-11-11/global-guide-checks.json) | 123 项测试及构建、两种 Chrome 视口、一次真实教程选择和局域网 HTTPS 升级。手机操作待测 |
| E-20261111-005 | [建房与收藏教程检查](../../evidence/2026-11-11/tutorial-expansion-checks.json) | 124 项测试及构建、两种 Chrome 视口、三次真实教程选择和局域网 HTTPS 升级。手机操作待测 |
| E-20261111-006 | [聊天动效检查](../../evidence/2026-11-11/guide-motion-checks.json) | 125 项测试和构建、两种宽度的过渡与视口检查及匹配的局域网文件。手机操作待测 |
| E-20261111-007 | [向导空回复检查](../../evidence/2026-11-11/guide-blank-reply-checks.json) | 127 项测试和构建、空回复复现、五轮回复恢复及真实局域网模型回复。手机操作待测 |
| E-20261111-008 | [聊天焦点和动效检查](../../evidence/2026-11-11/guide-spring-checks.json) | 128 项测试和构建、两种 Chrome 视口及匹配的局域网文件。真机键盘待测 |
| E-20261111-009 | [即时气泡检查](../../evidence/2026-11-11/guide-echo-checks.json) | 129 项测试和构建、两种宽度的延迟回复检查及匹配的局域网文件。iPhone 操作待测 |
| E-20261111-010 | [气泡弹出动效检查](../../evidence/2026-11-11/guide-css-bubble-checks.json) | 129 项测试和构建、WebKitGTK 中两个气泡的缩放和回弹、减少动态效果时的淡入及匹配的局域网文件。iPhone 操作待测 |
| E-20261111-011 | [教程确认检查](../../evidence/2026-11-11/guide-tutorial-offer-checks.json) | 130 项测试和构建、两种 WebKitGTK 宽度、过渡动画帧、减少动态效果及匹配的局域网文件。iPhone 操作待测 |
| E-20261111-012 | [教程返回检查](../../evidence/2026-11-11/guide-tutorial-return-checks.json) | 131 项测试和构建、两种 WebKitGTK 宽度、返回动效、进房后继续对话及匹配的局域网文件。iPhone 操作待测 |
| E-20261111-013 | [Indoor 默认模式检查](../../evidence/2026-11-11/indoor-default-checks.json) | 132 项测试和构建、WebKitGTK 建房与刷新，以及局域网临时房间创建与清理。现有房间模式和轮次保留 |
| E-20261111-014 | [教程动效检查](../../evidence/2026-11-11/tutorial-motion-checks.json) | 132 项测试和构建、两种 WebKitGTK 宽度、列表与步骤及关闭的动画帧、减少动态效果和匹配的局域网文件。iPhone 操作待测 |
| E-20261111-015 | [教程箭头飞行检查](../../evidence/2026-11-11/tutorial-flight-checks.json) | 132 项测试和构建、两种 WebKitGTK 宽度、淡出与飞行及淡入的顺序、减少动态效果和匹配的局域网文件。iPhone 操作待测 |

历史桌面截图此前保存在 `/tmp`，当前已不可用，未收入证据库。本轮不会补拍并冒充 10 月 28 日的原始截图。后续的小型脱敏附件放到共享目录 `progress/evidence/YYYY-MM-DD/`，本页提供中文说明，英文页提供等价说明。

原始 JSON 不受双语正文要求约束，不复制两份；人类观察的翻译必须保留原意、来源和不确定程度。大视频和私密材料只记录受控位置、hash 与访问说明，不将密钥或带令牌的 URL 放进索引。

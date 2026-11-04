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

历史桌面截图此前保存在 `/tmp`，当前已不可用，未收入证据库。本轮不会补拍并冒充 10 月 28 日的原始截图。后续的小型脱敏附件放到共享目录 `progress/evidence/YYYY-MM-DD/`，本页提供中文说明，英文页提供等价说明。

原始 JSON 不受双语正文要求约束，不复制两份；人类观察的翻译必须保留原意、来源和不确定程度。大视频和私密材料只记录受控位置、hash 与访问说明，不将密钥或带令牌的 URL 放进索引。

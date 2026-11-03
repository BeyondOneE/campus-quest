# Campus Quest

[English](README.md)

面向西浦太仓校区新生与访客的校园协作寻宝项目。当前交付平台为手机网页；第一阶段只适配用户的 **iPhone Safari**。

## 现在可以做什么

- Vite 原型 `/`（`npm run dev`）：保留的六页前端演示，房间、AR、语音、队友、排行榜及 AI 仍为模拟内容。后端根路径（`npm start`）跳转至 `/treasure-lab/`。
- `/device-check/`：独立的 Safari 真机验证页，检查后置相机、姿态与旋转速率、定位、切后台后的手动恢复，并导出 JSON 报告。
- `/treasure-lab/`：电脑后端托管的寻宝实验，支持访客场次、共享放置与每人领取持久化；见 [测试步骤](docs/treasure-lab.md)。尚未通过 Safari 实地验收。
- 实验已有真实后端；本地用户名 / 密码账号已实现；学生身份验证、最终多人玩法和空间 AR 跟踪尚未实现。原六页演示仍使用模拟功能。

## 本地开发

共享实验使用已验证的 Node.js 24.19.0，运行 `npm start`，打开 `http://127.0.0.1:4180/treasure-lab/`。电脑同时提供页面与 [业务 API](docs/backend-api.md)。手机使用 [局域网 HTTPS](docs/lan-access.md)、匹配的 `PUBLIC_ORIGIN` 及用户手动信任的开发证书；Cloudflare 保持关闭，手机信任和连通仍待确认。

前端交接从 [Claude 开工指令](docs/claude-frontend-brief.md)、[修改 / 验收说明](docs/frontend-handoff.md) 和 [接口契约](docs/backend-api.md) 开始；文档对应包含尚未提交文件的当前工作树。

保留的 Vite 原型使用 Node.js 22.12+ 的兼容版本（历史在 Node.js 22.23.2 验证，共享后端当前使用 Node.js 24.19.0）：

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

不要直接双击 `dist/index.html`。默认部署到网站根目录。

## iPhone 真机检查

无需安装 npm 依赖即可运行独立验证页：

```sh
python3 scripts/serve_device_check.py
```

手机需要打开受信任的 **HTTPS** 地址。电脑上的 `http://localhost` 特例不适用于手机访问电脑的局域网 IP。该 Python 服务只提供四个诊断文件，不开放源码、目录列表或上传接口；共享寻宝后端改用 `npm start`。

详细步骤见 [Safari 测试清单](docs/safari-device-check.md)。相机、传感器、定位权限需要由用户在 iPhone 上自行确认。

## 当前验证边界

项目测试分为自动化逻辑测试、桌面浏览器检查、iPhone 真机实测三类。前两类通过不代表 iPhone 硬件能力已经通过。最新状态见 [项目状态](docs/project-status.md)。

精确坐标默认不会写入导出的报告，报告和相机画面不会自动上传。共享实验中，开启定位会向电脑发送位置作范围判定；共享点坐标保存到被忽略的 SQLite，玩家最近位置只在内存保留，不保存轨迹。访客身份和领取记录刷新后可恢复；诊断页刷新仍清空状态。私密报告与数据库不得进入 Git。

## 过程记录与规范

- [中文进度](progress/zh-CN/README.md) / [English progress](progress/en/README.md)
- [仓库规范](docs/repository-guidelines.zh-CN.md) / [agent 执行规则](AGENTS.zh-CN.md)
- 所有维护中的文字分别保存中英文版本，同一提交同步更新；每周汇总对应 Form 1。课程平台提交单独留存凭据。

## 目录

- `src/`、`public/assets/`：从交接包导入的原型。
- `public/device-check/`：无第三方运行依赖的真机诊断页面。
- `public/treasure-lab/`：英文功能页、同源 API 适配器、真实定位与相机生命周期。
- `server/`：Node HTTP 后端、SQLite 账号 / 访客场次 / 共享点 / 收集凭据；私密数据保存在被忽略的 `.local/`。
- `scripts/`：只提供诊断页面的本地服务器。
- `tests/`：数据有效性、权限和生命周期测试。
- `docs/archive/`：原始 proposal、交接说明和来源校验清单。
- `docs/`：双语规范、已确认范围、测试方法与实测状态。
- `progress/`：双语日记、周模板、索引和共享脱敏证据。

原始 proposal 中的 Rokid 眼镜方案为历史背景；当前手机网页决策以项目状态文档为准。包含 API 密钥或个人信息的课程资料保留在仓库外。

# Campus Quest

[English](README.md)

面向西浦太仓校区新生与访客的校园协作寻宝项目。当前交付平台为手机网页；第一阶段只适配用户的 **iPhone Safari**。

## 现在可以做什么

- `/`：保留的六页前端演示。房间、AR、语音、队友、排行榜及 AI 仍为模拟内容。
- `/device-check/`：独立的 Safari 真机验证页，检查后置相机、姿态与旋转速率、定位、切后台后的手动恢复，并导出 JSON 报告。
- 当前没有后端、真实多人房间、账号验证或空间 AR 跟踪。

## 本地开发

使用 Node.js 22.12+ 的兼容版本（已在 Node.js 22.23.2 验证）：

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

手机需要打开受信任的 **HTTPS** 地址。电脑上的 `http://localhost` 特例不适用于手机访问电脑的局域网 IP。临时 HTTPS 入口可以转发到此专用服务器；它仅提供验证页的四个静态文件，不开放源码、目录列表或数据上传接口。

详细步骤见 [Safari 测试清单](docs/safari-device-check.md)。相机、传感器、定位权限需要由用户在 iPhone 上自行确认。

## 当前验证边界

项目测试分为自动化逻辑测试、桌面浏览器检查、iPhone 真机实测三类。前两类通过不代表 iPhone 硬件能力已经通过。最新状态见 [项目状态](docs/project-status.md)。

精确坐标默认不会写入导出的报告。报告和相机画面不会自动上传；不要将含坐标的测试报告提交 Git。当前页面刷新会清空本次测试状态。

## 过程记录与规范

- [中文进度](progress/zh-CN/README.md) / [English progress](progress/en/README.md)
- [仓库规范](docs/repository-guidelines.zh-CN.md) / [agent 执行规则](AGENTS.zh-CN.md)
- 所有维护中的文字分别保存中英文版本，同一提交同步更新；每周汇总对应 Form 1。课程平台提交单独留存凭据。

## 目录

- `src/`、`public/assets/`：从交接包导入的原型。
- `public/device-check/`：无第三方运行依赖的真机诊断页面。
- `scripts/`：只提供诊断页面的本地服务器。
- `tests/`：数据有效性、权限和生命周期测试。
- `docs/archive/`：原始 proposal、交接说明和来源校验清单。
- `docs/`：双语规范、已确认范围、测试方法与实测状态。
- `progress/`：双语日记、周模板、索引和共享脱敏证据。

原始 proposal 中的 Rokid 眼镜方案为历史背景；当前手机网页决策以项目状态文档为准。包含 API 密钥或个人信息的课程资料保留在仓库外。

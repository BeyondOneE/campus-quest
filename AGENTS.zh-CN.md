# Campus Quest 开发规则

[English](AGENTS.md)

- 当前验收目标是用户的 iPhone Safari。未有新决定前，不扩展到 Android、其他浏览器、微信小程序或原生 App。
- 保留 `docs/archive/` 和仓库外的原始交接包。平台决策以 [项目状态](docs/project-status.md) 为准，原 proposal 为历史来源。
- 模拟队友、权限获批、接口存在、桌面截图或单元测试样本不能证明 iPhone 硬件或空间 AR 通过。已确认的 Brave 实测只作辅助证据，不计作 Safari 验收。
- 不提交凭证、设备 UDID / 序列号、精确位置或私密原始报告。诊断页不得自动上传相机 / 定位数据。
- 代码变更执行适用的 `npm ci`、`npm test` 和 `npm run build`。独立诊断服务器只需要 Python 3。纯文档工作检查双语配对、链接和 diff，不编造代码测试结果。
- 遵循 [仓库规范](docs/repository-guidelines.zh-CN.md)。开始前阅读当前状态和 [最近进度](progress/zh-CN/README.md)。实质代码、测试、反馈分析或决策结束后更新当日日记和索引；项目状态只更新确有变化的事实。
- 所有维护中的文字改动必须在同一提交保存分开的中英文版本。`progress/zh-CN/` 与 `progress/en/` 使用相同相对路径，保持 ID、日期、数字、状态和证据限制一致。根 `README.md`、`AGENTS.md` 配 `.zh-CN.md`；现有中文 `docs/*.md` 配 `.en.md`。`docs/archive/` 原件不改；共享代码和机器 / 媒体证据不重复翻译。
- 补记同时注明事件日期、编写日期和来源。不倒填 Git 日期，不推断课程周次或成员工时，不伪造截图，不把用户观察替换成无依据的验收通过。
- 使用双语日记与 Form 1 周模板。确认课程周次后才建编号周记录；沿用实际课程看板，引用移动历史 / 截图，单独保存正式提交回执。保存到仓库或 Git push 不代表课程已提交。
- 披露人类和 AI 的分工。每位成员提供或确认自己的反思；不虚构个人经历、导师反馈、用户数、贡献证据或签名。正式提交中的个人资料默认不进 Git。
- 证据说明使用稳定 ID 和共享 [元数据索引](progress/evidence/evidence-index.json)。私密原报告保持忽略，只提交脱敏证据与说明。缺失证据明确标注不可用。

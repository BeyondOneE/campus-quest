# iPhone Safari 真机验证

[English](safari-device-check.en.md)

目标设备：用户通过 USB 读取的 `iPhone18,1`，iOS `27.2`，构建 `24B5089g`。USB 读取只证明设备基础信息可读，不证明 Safari 硬件功能通过。

## 打开页面

1. 在电脑运行 `python3 scripts/serve_device_check.py`，保持进程运行。
2. 用已配置的 HTTPS 入口转发到 `http://127.0.0.1:4174`。如使用 Cloudflare Quick Tunnel，运行 `cloudflared tunnel --url http://127.0.0.1:4174`。
3. 在 iPhone **Safari** 中打开生成的 HTTPS 地址，路径 `/device-check/`。
4. 确认显示“安全上下文”；由用户确认实际打开的是系统 Safari。页面只根据 UA 判断 Safari 特征，不能将此标签视为浏览器身份的证明。不需要 USB 连接或开发者模式。

临时隧道用于测试，无稳定可用性保证，停止隧道后链接失效。只有四个静态诊断文件会经入口提供；隧道服务可以看到普通页面访问的网络元数据，但页面不会上传坐标、传感器数据或相机画面。生产环境部署另行决定。

## 检查顺序

| 项目 | 操作 | 记录内容 |
| --- | --- | --- |
| 相机 | 点击开启并允许权限，观察 30 秒 | 是否后置、画面是否流畅、是否持续更新、报告分辨率 |
| 姿态和运动 | 点击授权，慢慢左右转、前后倾斜 | α/β/γ 是否更新、两类采样率、旋转速率、是否有指南针数据 |
| 相对视角 | 开相机和感应，点击校准后转动 | 虚拟线索是否随相对视角变化；屏幕转向后重新校准 |
| 定位 | 点击开启定位，可在室外开阔处等待 | 经纬度、系统报告精度、等待时间；不可称为已测量误差 |
| 同时运行 | 相机、感应和定位保持前台运行约 60 秒 | 画面是否卡顿、数据是否停更、明显发热等人工观察 |
| 拒绝后恢复 | 拒绝一项权限，再检查 Safari 网站/系统设置，允许后重试 | 实际恢复步骤和结果 |
| 切后台 | 切到其他 App 或锁屏，再返回 | 页面停止采集，重新点击开启是否恢复；没有承诺后台持续运行 |
| 报告 | 勾选真实观察结果并填写问题，导出 JSON | 默认不含坐标；未实测项目保持未勾选 |

拒绝权限后浏览器可能不再次弹窗。由用户在 iPhone 设置或 Safari 网站设置中调整，不通过脚本绕过授权。

## 证据与边界

- `requestPermission()` 缺失并不自动说明接口不能用，需要检查后续有效数据。
- 运动事件存在但 `rotationRate` 全为空，不算收到陀螺旋转速率。
- 本页的线索只是相对旋转可视化，不提供空间锚定、建筑识别或真实导航。
- 定位数据可能来自系统融合，不保证来自 GPS；`accuracy` 为提供方报告的置信半径。
- 默认报告不含精确坐标，不上传报告；如选择包含坐标，分享前自行检查。
- 自动化测试中的模拟数据不是手机实测结果。正式的通过/失败由真实设备观察和导出记录支持。

## 参考

- [相机接口与安全上下文](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [方向与运动事件、用户手势授权](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Detecting_device_orientation)
- [定位精度属性](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy)
- [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

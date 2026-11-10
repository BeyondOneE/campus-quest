# 室内 RoNIN 与模式切换

[English](indoor-demo.en.md) · 更新于 2026-11-11，CQ-20261110-007 至 CQ-20261110-011 及 CQ-20261111-017

在 `/treasure-lab/` 的房间内，房主从右上角菜单选择 **Outdoor** 或 **Indoor**。已有宝箱时，点 **Keep current mode** 返回菜单，点 **Switch and reset round** 则清除当前宝箱、该轮领取和临时领取资格。刷新和重启后会保留已选模式。升级时，使用两种旧室内模式的房间会转到 GPS，清除当前放置点并开启新轮次。迁移保留房间、房主、成员和历史领取记录。

## 室内 RoNIN 演示

后端接受来自所配置 `PUBLIC_ORIGIN` 的 Indoor 请求，包括公网 HTTPS 域名。服务器需要配置 RoNIN 的 Python 环境、上游模型源码和权重。运动时间窗发送到该游戏服务器推理，相机画面留在手机。每次请求都要求房主身份和有效的会话 CSRF 令牌。

1. 在 iPhone Safari 用可信 HTTPS 地址打开游戏。选择 **Indoor**，点 **Enable motion**，竖直拿稳手机，等到 **Hide treasure here** 可用。
2. 放置宝箱，打开 AR 雷达并走开。估计偏移到 0.7 米后停一下，确认离开。朝放置点走回，在估计 0.5 米范围内持续一秒即可进入搜索。持机高度尽量接近起始高度，倾斜相机，将宝箱对准画面中心。保持朝向宝箱，等准星进度环填满，再点亮起的 **Claim treasure**。
3. 如果运动读数中断，重新启用运动，在新坐标系内重新放置宝箱。雷达、相机和位移估计共用同一个修正后的 iPhone 坐标系。

手机把加速度和陀螺仪特征对齐到重力方向。电脑使用与离线对照相同的 ResNet18 权重及 200 Hz 插值，以一秒时间窗和 50 ms 步长预测速度，手机积分得到位置。约每 200 ms 更新一批。按窗口中点估计会有约 500 ms 的时延，另加分批和处理时间。宝箱位于假定镜头下方 0.25 米，雷达半径 5 米。

手机以每条速度预测对应的时间为中心，检查 400 ms 内的传感器读数。线性加速度和角速度的均方根门槛分别为 0.35 m/s² 和 12°/s。传感器确认停稳后，该时段按零速度积分，即使模型仍给出残余速度。停步后可能继续收到之前的走动估计，走路、晃动和转动期间模型继续估计。瞄准还会检查当前运动读数是否稳定。

进入近场时锁定本次相机瞄准方向，最大下倾角为 35°。距离放置点不足 0.1 米时，采用最后一个可用的接近方位，缺少该方位时采用当时朝向。雷达继续显示实时估计的平面方位和距离。与玩家箭头重合时，金点显示在箭头上方，超出 5 米时显示边缘箭头。

电脑需在 `.local/ronin-research/` 下配置 Python 环境、上游源码和权重。`./start.sh` 启动电脑服务和可选的本地推理进程。研究权重留在电脑端，供本次非商业课程演示使用。[权重归档与条款](https://doi.org/10.20383/102.0543) · [iPhone 录制与回放](motion-recording.md)

## 参考项目与验证

- RIDI 从手机 IMU 时间窗估计速度，用速度修正加速度后再做二次积分。研究仓库提供 C++ 和 Python 代码。[RIDI 项目与数据](https://yanhangpublic.github.io/ridi/index.html) · [代码](https://github.com/higerra/ridi_imu)
- RoNIN 用手机 IMU 学习行人运动，以人体轨迹作为验证真值。项目提供代码、超过 40 小时的记录和研究用模型权重。[RoNIN 项目](https://ronin.cs.sfu.ca/) · [代码](https://github.com/Sachini/ronin)
- IMUNet 提供 Android 采集和模型评测实现。阿尔托大学的手机里程计论文可作为传统滤波的参考，包含在线估计偏差及零速更新。[IMUNet Android 代码](https://github.com/BehnamZeinali/IMUNet_Android) · [阿尔托大学手机里程计研究](https://arxiv.org/abs/1703.00154)

比较这些方法时，可回放同一批 iPhone Safari 记录，覆盖已知长度的路线、停走以及人在原地时的手持运动，分别看移动中误差、停稳误差和回到起点的误差。在演示手机上核对浏览器读数的时间、单位和坐标轴后，再用研究基准作对照。

从 **Menu → Test tools** 打开运动录制，房主也可以在此查看相对宝箱的估计偏移。水平加速度积分作为离线对照基准。[运动录制与离线回放](motion-recording.md)

## 估计限制与中断

RoNIN 使用房主手机的本地运动坐标系。相机按校准时的持机高度投影，位置估计可能漂移。访客可查看房间状态，GPS 模式支持基于共享位置的多人玩法。

切到后台或主动停止运动时，系统取消近场搜索并释放传感器。有效读数间隔超过 100 ms 时，需要重新启用运动，并在新坐标系内放置宝箱。过期、不合理或坐标系不匹配的读数无法解锁领取。

## 接口与数据

新建房间默认为 Indoor（`indoor-ronin`）。加入或恢复房间时，使用该房间保存的模式。模式功能推出前创建的房间使用 Outdoor（`gps`）。状态包通过 `room.mode` 和 `state.mode` 返回当前模式。

- `POST /api/mode` 接受 `{ roomCode, treasureId, mode }`，沿用身份 / CSRF / Origin / JSON 校验，房主请求后返回重置状态。`indoor-ronin` 需要局域网入口和模型文件。模型不可用时保留当前轮次。
- `POST /api/ronin` 仅接受 RoNIN 模式房主从局域网或回环来源发送的 `{ roomCode, frames, startMs, count }`。每条读数含相对时间毫秒数、本地坐标系下三轴角速度（rad/s）和三轴含重力加速度（m/s²）。每次覆盖一至八个连续窗口，请求体上限 48 KiB，采样间隔上限 100 ms。返回 `{ velocities: [[vx, vy], ...] }`，按窗口顺序给出米每秒的速度。沿用会话及 CSRF 校验。缺少运行依赖时返回 `RONIN_UNAVAILABLE`。
- `POST /api/indoor` 接受 RoNIN 房间房主的 `{ roomCode, treasureId, fix }`，返回状态及 `accepted`。读数来源为 `ronin-imu`，包含 `frameId`、`timestamp`、`x`、`y`、`heading` 和布尔值 `stationary`。按 3 m/s 的速度及 0.02 米容差限制位移。本地坐标限 ±20 米，时效 1500 ms。
- RoNIN 进入近场后，`state.guidance.frame` 为 `indoor`，同时提供 `pitchDegrees` 和 `bearingDegrees`。瞄准及领取需要放置时坐标系的新鲜运动数据、有效遭遇和实时画面。瞄准范围为 18°，停留需达 700 ms。估计水平位置离瞄准起点超过 0.20 米时重新计时。
- RoNIN 近场的 `bearingDegrees` 和 `pitchDegrees` 表示锁定的相机目标。额外的 `radarBearingDegrees` 与实时 `distanceMeters` 用于在雷达上标记放置点。
- GPS 和室内读数限定在对应模式提交（`MODE_CHANGED`）。RoNIN 模式的短时特征在电脑内存中处理。本地位置估计和瞄准样本沿用游戏接口，被忽略的数据库保存已放置的本地点和坐标系。相机画面和原始运动录制留在手机。
- `GET/POST /api/guide` 上下文新增 `positionMode`、`distanceLabel`；室内为 `gps: not-used`、`place: null`、明确的估计距离，抑制 GPS / 到楼主动事件。模式切换不需要真实模型调用。

当前有 19 个 API 路由、15 个公开白名单文件，游戏 DOM 契约有 146 个 ID。[RoNIN 与模式迁移验证](../progress/zh-CN/daily/2026-11-10.md)

# 运动传感器录制与离线对照

[English](motion-recording.en.md) · 2026-11-10 · CQ-20261110-005

进房后打开 **Menu → Test tools → Motion recording**，也可用同一个可信局域网 HTTPS 地址打开 `/treasure-lab/motion-recording.html`。点 **Start recording** 后才开始记录手机运动，点 **Export JSON** 保存一份文件。录制内容暂存在标签页内存里，切到后台会停止录制。刷新或开始下一组前先导出。

分开录两组：

1. **Shake in place**。竖直拿稳手机，等 **Mark start** 可用后点击。双脚留在起点，晃动手机，停止晃动时点 **Mark end of shake**。再拿稳三秒，点 **Mark settled**，继续录一秒后停止并导出。
2. **Measured out and back**。在直线上标好起点、中点和远端，输入单程米数。开始时竖直拿稳手机并朝向远端。按提示标记去程中点、到达、远端停稳、回程中点、返回和最终停稳。经过中点时直接点标记。每次停稳至少三秒再标记，最后一个标记后继续录一秒。

文件含事件及接收时间、采样间隔、屏幕角度、线性和含重力加速度、角速度及带时间的参考点。缺失读数记为 null。页面的网络和硬件权限限制为本地运动录制，导出不含 GPS、视频、账号或房间数据。原始文件放在忽略的本地目录，例如 `.local/motion-trials/`。

## 在电脑上回放

`node scripts/replay-motion.mjs RECORDING.json` 可回放游戏当前的积分算法，并准备与重力对齐的 IMU 特征。测试电脑已在 `.local/ronin-research/` 下准备 NumPy、CPU 版 PyTorch、RoNIN 官方源码和 ResNet18 权重。权重用于非商业用途，存放在 Git 忽略的本地目录。[RoNIN 源码](https://github.com/Sachini/ronin) · [权重归档和条款](https://doi.org/10.20383/102.0543)

```sh
.local/ronin-research/venv/bin/python scripts/compare-ronin.py RECORDING.json \
  --ios-motion \
  --ronin-repo .local/ronin-research/upstream \
  --checkpoint .local/ronin-research/resnet18.pt \
  --output .local/motion-trials/comparison.json
```

两个算法使用同一份原始记录和初始坐标轴。对照工具按照[上游特征约定](https://github.com/Sachini/ronin/blob/master/source/data_glob_speed.py)，向 RoNIN 输入校准后以 rad/s 表示的角速度和含重力加速度，插值到 200 Hz，并在每个一秒时间窗的中点对估计速度积分。插值只对齐时间。报告给出原始采样率、移动中的均方根和最大误差、停稳后的均方根误差、各标记点误差及两条轨迹。两条轨迹只用起点对齐。

晃动试验的参考是人体在标记期间一直留在原点。往返试验只有手动标记点的位置已知，点击时刻本身有误差。`--ios-motion` 按 `alpha`、`beta`、`gamma` 读取陀螺仪 X、Y、Z，并反转两路加速度的符号。省略此参数可重现原输入。实时 RoNIN 演示使用同一套 iPhone 修正。[回放结果](../progress/zh-CN/daily/2026-11-10.md#cq-20261110-006--iphone-运动录制回放结果)

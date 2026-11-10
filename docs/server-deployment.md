# 香港服务器部署

[English](server-deployment.en.md)

记录于 2026-11-11。用户租用公网 IP 为 `47.243.250.52` 的香港 ECS 并提供 SSH 密钥。阿里云签名身份已校验，地域为 `cn-hongkong`。服务器运行 Ubuntu 24.04.5、Node.js 24.19.0、Caddy 2.11.9、CPU PyTorch 2.15.0 和 NumPy 2.5.4。应用和 RoNIN 推理通过服务端检查，公网 DNS 与 HTTPS 启用待完成。

计划入口为 `https://www.chenjiajun.com/`。在域名当前 DNS 服务商处添加 A 记录，主机记录填 `www`，记录值填 `47.243.250.52`。当前权威域名服务器属于 `35.net`。TTL 保持默认。服务器安全组和防火墙需要允许入站 TCP 80 和 443，供公网 HTTP 跳转、证书验证和 HTTPS 使用。

应用目录为 `/opt/campus-quest`。`campus-quest` systemd 服务使用专用账号运行，监听 `127.0.0.1:4180`，开机启动，异常退出后自动重启。服务配置设定精确的 `PUBLIC_ORIGIN`。Caddy 将所配置域名转发到该监听地址并提供 HTTPS。仓库中的配置为 [campus-quest.service](../deploy/campus-quest.service) 和 [Caddyfile](../deploy/Caddyfile)。

运行文件包括 `server/`、`public/`、`package.json`、`scripts/serve-ronin.py` 和 `scripts/ronin_model.py`。后端使用 Node 内置模块，直接提供 public 目录的 JavaScript。较早的 React 原型仍是独立构建目标。

私有 `.env` 提供已有 AI 配置，仅服务账号可读。`.local/ronin-research/` 保存 Python 虚拟环境、ResNet18 权重以及附带许可证的上游模型源码。模型校验值为 `5ae5c9e508f2dc9609c25b59d0e3dfd770ecbcde6920cbc5be3c6d9fed8a6346`。权重、凭据和数据库放在 Git 之外。新服务器使用独立的新数据库，需要重新注册账号。

在服务器上可使用以下命令。

```sh
systemctl status campus-quest
systemctl restart campus-quest
journalctl -u campus-quest -n 50 --no-pager
curl --fail http://127.0.0.1:4180/api/health
caddy validate --config /etc/caddy/Caddyfile
```

域名解析到新 IP 后，启动 Caddy 并检查可信公网地址。

```sh
systemctl start caddy
curl --fail https://www.chenjiajun.com/api/health
```

检查期间创建并清理了一个临时房间，通过已配置的公网来源选择 Indoor，对一个合成时间窗运行真实 CPU 模型，并收到了 DeepSeek 导览回答。单次推理请求耗时 173 ms。这是后端冒烟检查的测量值。iPhone 相机、运动定位和教室网络表现仍需真机测试。 [E-20261111-016](../progress/evidence/2026-11-11/hong-kong-deployment-checks.json)

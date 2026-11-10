# Hong Kong server deployment

[中文](server-deployment.md)

Recorded on 2026-11-11. The user rented a Hong Kong ECS at `47.243.250.52` and supplied the SSH key. Its Alibaba-signed identity was verified as `cn-hongkong`. The server runs Ubuntu 24.04.5, Node.js 24.19.0, Caddy 2.11.9, CPU PyTorch 2.15.0 and NumPy 2.5.4. The application and RoNIN inference passed server-side checks. Public DNS and HTTPS activation are pending.

The intended entry is `https://www.chenjiajun.com/`. In the domain's current DNS provider, add an A record with host `www` and value `47.243.250.52`. The authoritative nameservers currently use `35.net`. Keep the default TTL. The server's security group and firewall must allow incoming TCP 80 and 443 for public HTTP redirects, certificate validation and HTTPS.

The app lives at `/opt/campus-quest`. Its `campus-quest` systemd service runs under a dedicated account, listens on `127.0.0.1:4180`, starts on boot and restarts after failure. The unit sets the exact `PUBLIC_ORIGIN`. Caddy forwards the configured domain to that listener and supplies HTTPS. The checked-in configurations are [campus-quest.service](../deploy/campus-quest.service) and [Caddyfile](../deploy/Caddyfile).

The runtime uses `server/`, `public/`, `package.json`, `scripts/serve-ronin.py` and `scripts/ronin_model.py`. The backend uses Node's built-in modules and serves the public JavaScript directly. The earlier React prototype remains a separate build target.

The private `.env` provides the existing AI configuration and is readable by the service account only. `.local/ronin-research/` contains the Python virtual environment, ResNet18 checkpoint and upstream model source with its license. The model checksum is `5ae5c9e508f2dc9609c25b59d0e3dfd770ecbcde6920cbc5be3c6d9fed8a6346`. Weights, credentials and databases stay outside Git. The new server starts with a separate database and requires new account registration.

Useful commands on the server are

```sh
systemctl status campus-quest
systemctl restart campus-quest
journalctl -u campus-quest -n 50 --no-pager
curl --fail http://127.0.0.1:4180/api/health
caddy validate --config /etc/caddy/Caddyfile
```

Once the domain resolves to the new IP, start Caddy and check the trusted public URL.

```sh
systemctl start caddy
curl --fail https://www.chenjiajun.com/api/health
```

The checks created and removed a temporary room, selected Indoor from the configured public origin, ran the real CPU model on one synthetic window, and received a DeepSeek guide response. One inference request took 173 ms. This is a backend smoke measurement. iPhone camera, motion tracking and classroom network behavior still require physical testing. [E-20261111-016](../progress/evidence/2026-11-11/hong-kong-deployment-checks.json)

# Direct LAN HTTPS access

[中文](lan-access.md)

The current development computer's Wi-Fi address was verified as `192.168.50.136` on 2026-11-03. The phone must be on the same reachable local network. This is a direct connection to the computer, with no Cloudflare or other external relay. Device-to-device reachability from the user's phone has not yet been tested.

## Current phone entry

1. Open `http://192.168.50.136:4181/` in iPhone Safari. This setup page serves only its instructions and the public development certificate. It cannot access the app API or private keys.
2. Download the certificate named **Campus Quest LAN Development CA**. The user must install the downloaded profile under Settings → General → VPN & Device Management.
3. Under Settings → General → About → Certificate Trust Settings, enable full trust for that development certificate. See [Apple's instructions](https://support.apple.com/en-gb/102390).
4. Open `https://192.168.50.136:4443/treasure-lab/`. It must load without a certificate warning before starting location or camera. Never bypass a Safari security warning; check the certificate, address and device date instead.

The certificate is not installed or trusted automatically. Trusting this root accepts certificates signed by its private key; keep that key private and remove the installed profile after testing. The root lasts 30 days and the server certificate 7 days. The public root fingerprint is displayed on the setup page and printed during generation. No machine or phone trust store was changed by the setup script.

## One-command startup

From `/home/beyondonee/projects/campus-quest` run:

```sh
./start.sh
```

The executable wrapper also works from another directory when called by its absolute path. It needs Linux / Ubuntu, Python 3, Node.js 24 or newer, OpenSSL and the `ip` command. The runtime uses Node built-ins; starting the services does not install dependencies or build the old React demo.

The script selects an assigned private Wi-Fi IPv4 address (or an unambiguous default-route LAN address), checks certificates, starts the backend and LAN HTTPS / setup proxy in the background, and verifies all three endpoints. It prints the current phone URL and setup URL. Repeating startup reuses matching healthy detached processes. An old terminal-attached process, changed IP / origin, renewed leaf certificate or explicit restart causes only the verified repository service to be replaced. Closing the launching terminal leaves the detached services running; this does not install a boot service or an automatic crash-restart supervisor.

```sh
./start.sh status
./start.sh restart
./start.sh stop
# Choose an address when several interfaces are active:
./start.sh --ip 192.168.50.136
```

`status` exits with code 1 if any endpoint is unavailable; `--json` gives machine-readable output. Logs append to ignored `.local/backend.log` and `.local/lan-proxy.log`; private process metadata / lock files are `.local/services.json` and `.local/services.lock`. Stop preserves the database, accounts, rooms, claims and certificates. Ownership is checked against process cwd, Node entrypoint and process start time; PID files alone never authorize termination. Unrelated port owners are left untouched and reported as a startup error. The command lock prevents concurrent start / stop races. Failed startup cleans up only processes started by that attempt.

A valid root is reused. A missing / mismatched-address / near-expiry leaf certificate is regenerated using the same root; a mismatched key is repaired by leaf regeneration. An incomplete / invalid / mismatched or near-expiry root produces an error rather than replacing phone trust automatically. The phone user still installs / trusts the root manually. The script never uploads device data, modifies trust stores / firewall rules, deletes the running database or enables an external relay.

For isolated checks / alternate local ports, optional `CQ_BACKEND_PORT`, `CQ_TLS_PORT` and `CQ_SETUP_PORT` override defaults 4180, 4443 and 4181. Ports must be distinct, within 1024–65535. The launcher passes the backend's exact `PUBLIC_ORIGIN` and the proxy destination automatically. These settings do not change the same-origin / loopback boundary.

## Manual computer startup

Run from the repository, using the actual Wi-Fi address assigned to the computer:

```sh
python3 scripts/setup_lan_tls.py 192.168.50.136
PUBLIC_ORIGIN=https://192.168.50.136:4443 npm start
```

Keep that backend running. In another terminal:

```sh
npm run start:lan
```

The backend stays on loopback port 4180. A TLS proxy binds only the Wi-Fi address on port 4443 and forwards to that fixed backend. Its setup server binds the same Wi-Fi address on port 4181 and exposes only `/` and `/campus-quest-root.cer`. No router forwarding, external provider, system certificate installation or firewall change is performed.

Certificates and private keys are generated under ignored `.local/lan-tls/`. The directory is private and keys have owner-only permissions. The script reuses the current development root and regenerates the server certificate; incomplete CA files cause an error rather than silently replacing trust. If the IP changes, rerun with the new private address, update `PUBLIC_ORIGIN`, and restart both processes. New addresses and ports create a different browser origin, so existing guest cookies may not carry over.

## Validation and limits

Computer-side checks verified the certificate chain and correct IP with the explicit development CA, rejected a wrong hostname, created two independent HTTPS guest sessions in the same room, checked Secure cookies and blocked access to private files. Certificate verification was not disabled. These checks used no device locations or camera frames and do not prove phone trust, network reachability or field acceptance.

Ordinary LAN HTTP can show a page, but geolocation and camera capture require a secure context; see [MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts). A router or managed Wi-Fi network may isolate devices. If the setup page cannot be reached from the phone, first confirm the network and device-to-device access; no firewall rules were changed automatically. This remains a temporary development service, available only while both computer processes run.

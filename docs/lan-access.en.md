# Direct LAN HTTPS access

[中文](lan-access.md)

The current development computer's Wi-Fi address was verified as `192.168.50.136` on 2026-11-03. The phone must be on the same reachable local network. This is a direct connection to the computer, with no Cloudflare or other external relay. Device-to-device reachability from the user's phone has not yet been tested.

## Current phone entry

1. Open `http://192.168.50.136:4181/` in iPhone Safari. This setup page serves only its instructions and the public development certificate. It cannot access the app API or private keys.
2. Download the certificate named **Campus Quest LAN Development CA**. The user must install the downloaded profile under Settings → General → VPN & Device Management.
3. Under Settings → General → About → Certificate Trust Settings, enable full trust for that development certificate. See [Apple's instructions](https://support.apple.com/en-gb/102390).
4. Open `https://192.168.50.136:4443/treasure-lab/`. It must load without a certificate warning before starting location or camera. Never bypass a Safari security warning; check the certificate, address and device date instead.

The certificate is not installed or trusted automatically. Trusting this root accepts certificates signed by its private key; keep that key private and remove the installed profile after testing. The root lasts 30 days and the server certificate 7 days. The public root fingerprint is displayed on the setup page and printed during generation. No machine or phone trust store was changed by the setup script.

## Computer startup

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

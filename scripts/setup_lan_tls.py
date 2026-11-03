#!/usr/bin/env python3
"""Prepare private, local-only development certificates; never install trust roots."""
import argparse
import ipaddress
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def run(*args):
    return subprocess.run(["openssl", *map(str, args)], check=True, capture_output=True, text=True).stdout


def prepare(address):
    ip = ipaddress.IPv4Address(address)
    if not ip.is_private or ip.is_loopback or ip.is_unspecified or ip.is_multicast or ip.is_link_local:
        raise ValueError("Use a private LAN IPv4 address assigned to this computer.")
    directory = ROOT / ".local" / "lan-tls"
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    os.chmod(directory.parent, 0o700)
    os.chmod(directory, 0o700)
    ca_key, ca_cert = directory / "root.key", directory / "root.pem"
    if ca_key.exists() != ca_cert.exists():
        raise ValueError("Incomplete CA files: preserve existing files and repair them before continuing.")
    if not ca_key.exists():
        run("req", "-x509", "-newkey", "rsa:3072", "-noenc", "-sha256", "-days", "30",
            "-subj", "/CN=Campus Quest LAN Development CA", "-keyout", ca_key, "-out", ca_cert,
            "-addext", "basicConstraints=critical,CA:TRUE,pathlen:0",
            "-addext", "keyUsage=critical,keyCertSign,cRLSign")
    os.chmod(ca_key, 0o600)
    key, csr, cert = directory / "server.key", directory / "server.csr", directory / "server.pem"
    extensions = directory / "server.ext"
    extensions.write_text("basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\n"
                          "extendedKeyUsage=serverAuth\n" + f"subjectAltName=IP:{ip},IP:127.0.0.1,DNS:localhost\n")
    run("req", "-new", "-newkey", "rsa:2048", "-noenc", "-subj", f"/CN={ip}", "-keyout", key, "-out", csr)
    os.chmod(key, 0o600)
    run("x509", "-req", "-in", csr, "-CA", ca_cert, "-CAkey", ca_key, "-CAcreateserial", "-out", cert,
        "-days", "7", "-sha256", "-extfile", extensions)
    run("x509", "-in", ca_cert, "-outform", "DER", "-out", directory / "campus-quest-root.cer")
    run("verify", "-CAfile", ca_cert, "-verify_ip", str(ip), cert)
    fingerprint = run("x509", "-in", ca_cert, "-noout", "-fingerprint", "-sha256").strip()
    (directory / "address.txt").write_text(str(ip) + "\n")
    print("Prepared LAN-only certificates. No device trust settings were changed.")
    print(fingerprint)
    print(f"Phone setup: http://{ip}:4181/")
    print(f"HTTPS app after manual certificate trust: https://{ip}:4443/treasure-lab/")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("address", help="This computer's private LAN IPv4 address")
    args = parser.parse_args()
    prepare(args.address)

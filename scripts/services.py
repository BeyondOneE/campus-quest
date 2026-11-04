#!/usr/bin/env python3
"""Manage the repository's local Node services without installing a system service."""
import argparse
import fcntl
import ipaddress
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import ssl
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = tuple(ipaddress.ip_network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'))
ENTRIES = {'backend': 'server/index.mjs', 'proxy': 'server/lan-proxy.mjs'}


class ServiceError(Exception):
    pass


def private_ip(value):
    try:
        ip = ipaddress.IPv4Address(value)
        return any(ip in network for network in PRIVATE)
    except ipaddress.AddressValueError:
        return False


def select_address(interfaces, routes, saved='', requested=None):
    """Select only an address actually assigned to an active LAN interface."""
    candidates = []
    for interface in interfaces:
        name = interface['ifname']
        if name.startswith(('lo', 'docker', 'veth', 'br-', 'virbr', 'tailscale', 'tun', 'tap')):
            continue
        for address in interface.get('addr_info', []):
            ip = address.get('local', '')
            if address.get('family') == 'inet' and private_ip(ip):
                candidates.append((name, ip))
    assigned = {ip for _, ip in candidates}
    if requested is not None:
        if requested not in assigned:
            raise ServiceError('--ip must be a private IPv4 address currently assigned to this computer.')
        return requested
    wireless = [ip for name, ip in candidates if name.startswith(('wl', 'wlan')) or Path('/sys/class/net', name, 'wireless').exists()]
    preferred = wireless or [ip for name, ip in candidates if name in {r.get('dev') for r in routes}]
    preferred = list(dict.fromkeys(preferred or [ip for _, ip in candidates]))
    if saved in preferred:
        return saved
    if len(preferred) == 1:
        return preferred[0]
    if not preferred:
        raise ServiceError('No active private LAN IPv4 address found. Connect to Wi-Fi, then retry.')
    raise ServiceError('Several LAN addresses found. Choose one with --ip: ' + ', '.join(preferred))


def process_info(pid, root=ROOT):
    """PID files alone never authorize a signal: verify entrypoint, cwd and start time."""
    directory = Path('/proc') / str(pid)
    try:
        if Path(os.readlink(directory / 'cwd')).resolve() != root.resolve():
            return None
        argv = [os.fsdecode(a) for a in (directory / 'cmdline').read_bytes().split(b'\0') if a]
        if len(argv) < 2 or Path(os.readlink(directory / 'exe')).name != 'node':
            return None
        role = next((role for role, entry in ENTRIES.items() if argv[1] in (entry, str(root / entry))), None)
        if role is None:
            return None
        fields = (directory / 'stat').read_text().rsplit(')', 1)[1].split()
        if fields[0] == 'Z':
            return None
        env = dict(v.split('=', 1) for v in (directory / 'environ').read_bytes().decode(errors='replace').split('\0') if '=' in v)
        fds = {}
        inodes = set()
        for fd in (directory / 'fd').iterdir():
            try:
                target = os.readlink(fd)
                if fd.name in ('0', '1', '2'):
                    fds[fd.name] = target
                if target.startswith('socket:['):
                    inodes.add(target[8:-1])
            except OSError:
                pass
        return {'pid': pid, 'role': role, 'start': fields[19], 'session': int(fields[3]),
                'origin': env.get('PUBLIC_ORIGIN', ''), 'port': env.get('PORT', '4180'),
                'proxyPorts': [env.get(k, str(v)) for k, v in [('CQ_BACKEND_PORT', 4180), ('CQ_TLS_PORT', 4443), ('CQ_SETUP_PORT', 4181)]],
                'fds': fds, 'inodes': inodes}
    except (OSError, ValueError, IndexError):
        return None


def discover(root=ROOT):
    return [info for directory in Path('/proc').iterdir() if directory.name.isdigit()
            if (info := process_info(int(directory.name), root))]


def listeners(ports):
    result = []
    for name in ('tcp', 'tcp6'):
        path = Path('/proc/net') / name
        if not path.exists():
            continue
        for line in path.read_text().splitlines()[1:]:
            fields = line.split()
            port = int(fields[1].rsplit(':', 1)[1], 16)
            if fields[3] == '0A' and port in ports:
                result.append((port, fields[9]))
    return result


def ensure_ports_owned(processes, ports):
    for port, inode in listeners(set(ports.values())):
        role = 'backend' if port == ports['backend'] else 'proxy'
        if not any(inode in p['inodes'] and p['role'] == role for p in processes):
            raise ServiceError(f'Port {port} belongs to another process. Nothing was stopped; choose a free port or stop that application yourself.')


def stop_process(info, root=ROOT):
    current = process_info(info['pid'], root)
    if not current or current['start'] != info['start']:
        return
    try:
        os.kill(info['pid'], signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.monotonic() + 7
    while time.monotonic() < deadline:
        current = process_info(info['pid'], root)
        if not current or current['start'] != info['start']:
            return
        time.sleep(.1)
    raise ServiceError(f'{info["role"]} (PID {info["pid"]}) did not stop gracefully; it was not force-killed.')


class Manager:
    def __init__(self, root=ROOT):
        self.root = root.resolve()
        self.local = self.root / '.local'
        self.tls = self.local / 'lan-tls'
        self.state = self.local / 'services.json'
        self.ports = {name: int(os.environ.get(key, str(default))) for name, key, default in [
            ('backend', 'CQ_BACKEND_PORT', 4180), ('https', 'CQ_TLS_PORT', 4443), ('setup', 'CQ_SETUP_PORT', 4181)]}
        if len(set(self.ports.values())) != 3 or any(not 1024 <= p <= 65535 for p in self.ports.values()):
            raise ServiceError('Service ports must be distinct integers between 1024 and 65535.')

    def command(self, *argv):
        try:
            return subprocess.run(argv, capture_output=True, text=True, check=True, timeout=20).stdout
        except (subprocess.SubprocessError, OSError) as error:
            raise ServiceError(f'Command failed: {Path(argv[0]).name}. Check the installed tools / certificate files.') from error

    def saved_address(self):
        try:
            return (self.tls / 'address.txt').read_text().strip()
        except FileNotFoundError:
            return ''

    def address(self, requested):
        if not shutil.which('ip'):
            raise ServiceError('The ip command is required (Ubuntu package: iproute2).')
        interfaces = json.loads(self.command('ip', '-j', '-4', 'address', 'show', 'up'))
        routes = json.loads(self.command('ip', '-j', '-4', 'route', 'show', 'default'))
        return select_address(interfaces, routes, self.saved_address(), requested)

    def cert_command_ok(self, *argv):
        return subprocess.run(['openssl', *map(str, argv)], capture_output=True, timeout=10).returncode == 0

    def prepare_certificates(self, address):
        if not shutil.which('openssl'):
            raise ServiceError('OpenSSL is required to prepare LAN HTTPS certificates.')
        ca, key = self.tls / 'root.pem', self.tls / 'root.key'
        if ca.exists() != key.exists():
            raise ServiceError('Incomplete development CA. Preserve the existing files and repair them before starting.')
        if ca.exists() and not self.cert_command_ok('x509', '-in', ca, '-noout', '-checkend', '86400'):
            raise ServiceError('The development CA expires within a day or is invalid. Renew it deliberately and re-trust it on the phone; it was not replaced automatically.')
        if ca.exists() and self.command('openssl', 'pkey', '-in', str(key), '-pubout') != self.command('openssl', 'x509', '-in', str(ca), '-pubkey', '-noout'):
            raise ServiceError('The development CA key does not match its certificate. Preserve and repair the files before starting.')
        cert, server_key = self.tls / 'server.pem', self.tls / 'server.key'
        valid = all((self.tls / name).is_file() for name in ('root.pem', 'root.key', 'server.pem', 'server.key', 'campus-quest-root.cer'))
        valid = valid and self.saved_address() == address
        if valid:
            valid = self.cert_command_ok('verify', '-CAfile', ca, '-verify_ip', address, cert)
            valid = valid and self.cert_command_ok('x509', '-in', cert, '-noout', '-checkend', '86400')
            if valid:
                valid = self.command('openssl', 'pkey', '-in', str(server_key), '-pubout') == self.command('openssl', 'x509', '-in', str(cert), '-pubkey', '-noout')
        if valid:
            return False
        self.command(sys.executable, str(self.root / 'scripts/setup_lan_tls.py'), address)
        return True

    def request(self, url, certificate=False):
        handlers = [urllib.request.ProxyHandler({})]
        if certificate:
            handlers.append(urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=self.tls / 'root.pem')))
        opener = urllib.request.build_opener(*handlers)
        with opener.open(url, timeout=1.5) as reply:
            return reply.read(65536) if reply.status == 200 else b''

    def health(self, address):
        checks = {'backend': False, 'https': False, 'setup': False}
        for name, url in [('backend', f'http://127.0.0.1:{self.ports["backend"]}/api/health'),
                          ('https', f'https://{address}:{self.ports["https"]}/api/health'),
                          ('setup', f'http://{address}:{self.ports["setup"]}/campus-quest-root.cer')]:
            try:
                data = self.request(url, name == 'https')
                if name == 'setup':
                    checks[name] = data == (self.tls / 'campus-quest-root.cer').read_bytes()
                else:
                    body = json.loads(data)
                    checks[name] = body.get('ok') is True and body.get('service') == 'campus-quest'
            except (OSError, ValueError):
                pass
        return checks

    def wait(self, predicate, message):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(.2)
        raise ServiceError(message + ' See .local/backend.log and .local/lan-proxy.log.')

    def reusable(self, info, origin, changed):
        logfile = self.local / ('backend.log' if info['role'] == 'backend' else 'lan-proxy.log')
        detached = info['session'] == info['pid'] and info['fds'].get('0') == '/dev/null'
        detached = detached and all(info['fds'].get(fd) == str(logfile) for fd in ('1', '2'))
        if info['role'] == 'backend':
            return detached and info['origin'] == origin and info['port'] == str(self.ports['backend'])
        return detached and not changed and info['proxyPorts'] == [str(self.ports[k]) for k in ('backend', 'https', 'setup')]

    def launch(self, role, node, origin):
        env = os.environ.copy()
        env.update(PORT=str(self.ports['backend']), PUBLIC_ORIGIN=origin,
                   CQ_BACKEND_PORT=str(self.ports['backend']), CQ_TLS_PORT=str(self.ports['https']), CQ_SETUP_PORT=str(self.ports['setup']))
        path = self.local / ('backend.log' if role == 'backend' else 'lan-proxy.log')
        with path.open('ab') as log:
            os.chmod(path, 0o600)
            process = subprocess.Popen([node, ENTRIES[role]], cwd=self.root, env=env, stdin=subprocess.DEVNULL,
                                       stdout=log, stderr=log, start_new_session=True, close_fds=True)
        self.wait(lambda: process_info(process.pid, self.root), f'{role} did not start.')
        return process_info(process.pid, self.root)

    def start(self, requested=None, restart=False):
        node = shutil.which('node')
        if not node:
            raise ServiceError('Install Node.js 24 or newer, then retry.')
        if int(self.command(node, '--version').strip().lstrip('v').split('.')[0]) < 24:
            raise ServiceError('Use Node.js 24 or newer for the SQLite backend.')
        address = self.address(requested)
        origin = f'https://{address}:{self.ports["https"]}'
        processes = discover(self.root)
        ensure_ports_owned(processes, self.ports)
        changed = self.prepare_certificates(address)
        kept = {}
        for info in sorted(processes, key=lambda p: p['role'] != 'proxy'):
            if not restart and info['role'] not in kept and self.reusable(info, origin, changed):
                logfile = self.local / ('backend.log' if info['role'] == 'backend' else 'lan-proxy.log')
                os.chmod(logfile, 0o600)
                kept[info['role']] = info
            else:
                stop_process(info, self.root)
        created = []
        try:
            if 'backend' not in kept:
                kept['backend'] = self.launch('backend', node, origin); created.append(kept['backend'])
            self.wait(lambda: self.health(address)['backend'], 'Backend health check failed.')
            if 'proxy' not in kept:
                kept['proxy'] = self.launch('proxy', node, origin); created.append(kept['proxy'])
            self.wait(lambda: all(self.health(address).values()), 'LAN HTTPS / certificate setup check failed.')
            state = {'address': address, 'origin': origin, 'ports': self.ports,
                     'processes': [{k: p[k] for k in ('pid', 'role', 'start')} for p in kept.values()]}
            temporary = self.state.with_suffix('.tmp')
            temporary.write_text(json.dumps(state, indent=2) + '\n'); os.chmod(temporary, 0o600)
            temporary.replace(self.state)
        except BaseException:
            for info in reversed(created):
                stop_process(info, self.root)
            raise
        return self.status(address)

    def status(self, address=None):
        address = address or self.saved_address()
        processes = discover(self.root)
        checks = self.health(address) if private_ip(address) else {'backend': False, 'https': False, 'setup': False}
        return {'running': all(checks.values()) and {p['role'] for p in processes} == set(ENTRIES),
                'address': address, 'checks': checks,
                'processes': [{k: p[k] for k in ('pid', 'role')} for p in processes],
                'appUrl': f'https://{address}:{self.ports["https"]}/treasure-lab/',
                'setupUrl': f'http://{address}:{self.ports["setup"]}/', 'logs': str(self.local)}

    def stop(self):
        for info in sorted(discover(self.root), key=lambda p: p['role'] != 'proxy'):
            stop_process(info, self.root)
        self.state.unlink(missing_ok=True)
        return {'running': False, 'stopped': True, 'dataPreserved': True}


def main():
    parser = argparse.ArgumentParser(description='Start, inspect or stop Campus Quest LAN services.')
    parser.add_argument('action', nargs='?', choices=['start', 'status', 'stop', 'restart'], default='start')
    parser.add_argument('--ip', help='Choose an IPv4 address currently assigned to this computer.')
    parser.add_argument('--json', action='store_true', help='Print machine-readable status.')
    args = parser.parse_args()
    os.umask(0o077)
    try:
        manager = Manager()
        manager.local.mkdir(parents=True, exist_ok=True, mode=0o700); os.chmod(manager.local, 0o700)
        with (manager.local / 'services.lock').open('a') as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise ServiceError('Another service command is running. Wait for it to finish.')
            if args.action in ('start', 'restart'):
                result = manager.start(args.ip, args.action == 'restart')
            elif args.action == 'stop':
                result = manager.stop()
            else:
                result = manager.status(args.ip)
        if args.json:
            print(json.dumps(result))
        elif args.action == 'stop':
            print('Services stopped. Accounts, rooms, receipts and certificates were preserved.')
        else:
            print('Campus Quest is ready.' if result['running'] else 'Campus Quest is not fully running.')
            for info in result['processes']:
                print(f'  {info["role"]}: PID {info["pid"]}')
            print(f'  Phone app:   {result["appUrl"]}\n  Phone setup: {result["setupUrl"]}')
            print(f'  Logs: {result["logs"]}/backend.log and lan-proxy.log')
            print('Use the same reachable Wi-Fi. Install / trust the development certificate on the phone manually if needed.')
        return 0 if result.get('running') or result.get('stopped') else 1
    except (ServiceError, OSError, ValueError) as error:
        if args.json:
            print(json.dumps({'running': False, 'error': str(error)}))
        else:
            print(f'Cannot manage services: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

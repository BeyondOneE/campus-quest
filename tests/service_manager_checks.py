"""Isolated launcher checks: never signal the real checkout or use its database."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import urllib.request

REPOSITORY = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('services', REPOSITORY / 'scripts/services.py')
services = importlib.util.module_from_spec(spec)
spec.loader.exec_module(services)


def interface(name, address):
    return {'ifname': name, 'addr_info': [{'family': 'inet', 'local': address}]}


class SelectionChecks(unittest.TestCase):
    def test_wireless_preferred_over_ethernet_and_virtual_interfaces(self):
        interfaces = [interface('eth0', '192.168.77.2'), interface('docker0', '172.17.0.1'), interface('wlan0', '192.168.50.20')]
        self.assertEqual(services.select_address(interfaces, [{'dev': 'eth0'}]), '192.168.50.20')

    def test_ambiguous_or_unassigned_address_requires_explicit_choice(self):
        interfaces = [interface('wlan0', '192.168.50.20'), interface('wlan1', '192.168.60.20')]
        with self.assertRaises(services.ServiceError):
            services.select_address(interfaces, [])
        with self.assertRaises(services.ServiceError):
            services.select_address(interfaces, [], requested='203.0.113.5')
        self.assertEqual(services.select_address(interfaces, [], saved='192.168.60.20'), '192.168.60.20')
        self.assertEqual(services.select_address(interfaces, [], requested='192.168.50.20'), '192.168.50.20')

    def test_reused_pid_is_not_signalled(self):
        with patch.object(services, 'process_info', return_value={'start': 'new-process'}), patch.object(services.os, 'kill') as kill:
            services.stop_process({'pid': 123, 'start': 'old-process'})
            kill.assert_not_called()

    def test_foreign_listener_is_rejected_before_any_signal(self):
        with patch.object(services, 'listeners', return_value=[(4180, 'foreign-socket')]), patch.object(services.os, 'kill') as kill:
            with self.assertRaises(services.ServiceError):
                services.ensure_ports_owned([], {'backend': 4180, 'https': 4443, 'setup': 4181})
            kill.assert_not_called()


class LifecycleChecks(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='cq-service-tests-')
        self.root = Path(self.temporary.name)
        for folder in ['scripts', 'server', 'public']:
            shutil.copytree(REPOSITORY / folder, self.root / folder, ignore=shutil.ignore_patterns('__pycache__'))
        shutil.copy2(REPOSITORY / 'start.sh', self.root / 'start.sh')
        sockets = [socket.socket() for _ in range(3)]
        for connection in sockets:
            connection.bind(('0.0.0.0', 0))
        self.ports = [connection.getsockname()[1] for connection in sockets]
        for connection in sockets:
            connection.close()
        self.env = {**os.environ, **dict(zip(['CQ_BACKEND_PORT', 'CQ_TLS_PORT', 'CQ_SETUP_PORT'], map(str, self.ports)))}
        self.address = services.Manager(self.root).address(None)

    def command(self, action, expected=0, **extra):
        result = subprocess.run([str(self.root / 'start.sh'), action, '--ip', self.address, '--json'],
                                cwd='/tmp', env=self.env, capture_output=True, text=True, timeout=50, **extra)
        self.assertEqual(result.returncode, expected, result.stdout + result.stderr)
        return json.loads(result.stdout)

    def tearDown(self):
        try:
            self.command('stop')
            self.assertFalse(services.discover(self.root))
        finally:
            self.temporary.cleanup()

    def test_start_repeat_restart_stop_preserve_data_and_ca(self):
        first = self.command('start')
        self.assertTrue(first['running']); self.assertTrue(all(first['checks'].values()))
        initial_pids = {p['role']: p['pid'] for p in first['processes']}
        ca = (self.root / '.local/lan-tls/root.pem').read_bytes()
        for info in services.discover(self.root):
            self.assertEqual(info['session'], info['pid'])
            self.assertEqual(info['fds']['0'], '/dev/null')
        for name in ['backend.log', 'lan-proxy.log', 'services.json']:
            self.assertEqual(stat.S_IMODE((self.root / '.local' / name).stat().st_mode), 0o600)
        (self.root / '.local/backend.log').chmod(0o664)
        second = self.command('start')
        self.assertEqual(initial_pids, {p['role']: p['pid'] for p in second['processes']})
        self.assertEqual(stat.S_IMODE((self.root / '.local/backend.log').stat().st_mode), 0o600)
        self.assertEqual(ca, (self.root / '.local/lan-tls/root.pem').read_bytes())
        self.assertTrue(self.command('status')['running'])
        base = f'http://127.0.0.1:{self.ports[0]}'
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        request = urllib.request.Request(base + '/api/rooms', data=b'{"name":"Isolated launcher fixture"}',
                                         headers={'Origin': base, 'Content-Type': 'application/json'})
        with opener.open(request, timeout=3) as response:
            cookie = response.headers['Set-Cookie'].split(';')[0]
            room = json.load(response)['room']['code']
        restarted = self.command('restart')
        self.assertTrue(restarted['running'])
        self.assertNotEqual(initial_pids, {p['role']: p['pid'] for p in restarted['processes']})
        self.assertEqual(ca, (self.root / '.local/lan-tls/root.pem').read_bytes())
        with opener.open(urllib.request.Request(base + '/api/state', headers={'Cookie': cookie}), timeout=3) as response:
            self.assertEqual(json.load(response)['room']['code'], room)
        # A corrupt PID registry never selects unrelated processes; discovery verifies /proc.
        (self.root / '.local/services.json').write_text(json.dumps({'pid': os.getpid()}))
        self.assertTrue(self.command('stop')['dataPreserved'])
        self.assertTrue((self.root / '.local/campus-quest.sqlite').exists())
        self.assertFalse(self.command('status', expected=1)['running'])
        self.assertTrue(self.command('stop')['stopped'])

    def test_foreign_port_conflict_leaves_owner_and_database_untouched(self):
        with socket.socket() as unrelated:
            unrelated.bind(('127.0.0.1', self.ports[0])); unrelated.listen()
            result = self.command('start', expected=1)
            self.assertIn(f'Port {self.ports[0]}', result['error'])
            self.assertEqual(unrelated.getsockname()[1], self.ports[0])
            self.assertFalse(services.discover(self.root))
            self.assertFalse((self.root / '.local/campus-quest.sqlite').exists())

    def test_incomplete_ca_is_preserved_without_starting_processes(self):
        directory = self.root / '.local/lan-tls'
        directory.mkdir(parents=True)
        key = directory / 'root.key'; key.write_text('isolated incomplete CA fixture')
        result = self.command('start', expected=1)
        self.assertIn('Incomplete development CA', result['error'])
        self.assertEqual(key.read_text(), 'isolated incomplete CA fixture')
        self.assertFalse(services.discover(self.root))


if __name__ == '__main__':
    unittest.main(verbosity=2)

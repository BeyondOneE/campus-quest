import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('LAN certificate regeneration preserves the trusted root, verifies the new IP and keeps private keys private', () => {
  const result = spawnSync('python3', ['-c', `
import contextlib,importlib.util,io,tempfile,subprocess
from pathlib import Path
spec=importlib.util.spec_from_file_location('setup_lan_tls','scripts/setup_lan_tls.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with tempfile.TemporaryDirectory(prefix='cq-lan-cert-test-') as temp:
    module.ROOT=Path(temp)
    with contextlib.redirect_stdout(io.StringIO()):
        module.prepare('192.168.1.23')
        folder=Path(temp)/'.local'/'lan-tls'
        root=(folder/'root.pem').read_bytes()
        module.prepare('192.168.1.24')
    assert (folder/'root.pem').read_bytes()==root, 'Do not rotate a root already trusted by a phone'
    assert (folder/'root.key').stat().st_mode & 0o777 == 0o600
    assert (folder/'server.key').stat().st_mode & 0o777 == 0o600
    assert folder.stat().st_mode & 0o777 == 0o700
    for address,valid in [('192.168.1.24',True),('192.168.1.23',False)]:
        checked=subprocess.run(['openssl','verify','-CAfile',str(folder/'root.pem'),'-verify_ip',address,str(folder/'server.pem')],capture_output=True)
        assert (checked.returncode==0)==valid
    for address in ['8.8.8.8','127.0.0.1','0.0.0.0','169.254.1.1']:
        try: module.prepare(address)
        except ValueError: pass
        else: raise AssertionError('Unsupported address accepted: '+address)
    (folder/'root.pem').unlink()
    try: module.prepare('192.168.1.24')
    except ValueError: pass
    else: raise AssertionError('Incomplete root silently replaced')
`], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
});

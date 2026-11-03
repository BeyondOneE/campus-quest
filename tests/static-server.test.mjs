import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('standalone diagnostic server exposes only four diagnostic assets; the treasure app requires its backend', () => {
  const result = spawnSync('python3', ['-c', `
import importlib.util
spec = importlib.util.spec_from_file_location('lab_server', 'scripts/serve_device_check.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
for folder, names in module.FILES.items():
    for name in names:
        assert module.resolve_asset('/' + folder + '/' + name) == (folder, name)
        assert (module.PUBLIC / folder / name).is_file()
for path in ['/', '/device-check/', '/index.html']:
    assert module.resolve_asset(path) == ('device-check', 'index.html')
assert module.resolve_asset('/probe.js') == ('device-check', 'probe.js')
assert module.resolve_asset('/treasure-lab/') is None
for path in ['/src/App.tsx', '/.env', '/.git/config', '/treasure-lab/../model.js', '/treasure-lab/../../package.json', '/treasure-lab/%2e%2e/package.json', '/treasure-lab/', '/device-check/']:
    if path.endswith('/') and path in ['/treasure-lab/', '/device-check/']:
        continue
    assert module.resolve_asset(path) is None, path
`], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});

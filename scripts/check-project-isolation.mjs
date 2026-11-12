import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const identitySource = fs.readFileSync('src/data/projectIdentity.ts', 'utf8');
const identityJs = ts.transpileModule(identitySource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { assertProjectIdentity, PROJECT_ID } = await import('data:text/javascript;base64,' + Buffer.from(identityJs).toString('base64'));
assert.doesNotThrow(() => assertProjectIdentity({ id: PROJECT_ID }));
for (const id of ['bustamante-175', 'pardo-664', undefined]) {
  assert.throws(() => assertProjectIdentity({ id }));
}
const listeners = {};
const deleted = [];
let claimed = false;
let manifestResponse;
let precached;
let skippedWaiting = false;
const cachedResponse = { source: 'jp2168' };
const worker = fs.readFileSync('dist/sw.js', 'utf8');
assert.ok(!worker.includes('__BUILD_REVISION__'));
const cacheName = worker.match(/CACHE_PREFIX\}([^`]+)/)[1];
vm.runInNewContext(worker, {
  URL, Request, Response,
  fetch: async () => {
    if (manifestResponse) return manifestResponse;
    throw new Error('offline');
  },
  self: {
    registration: { scope: 'https://example.test/JP2168/' },
    location: { origin: 'https://example.test' },
    skipWaiting: async () => { skippedWaiting = true; },
    clients: { claim: async () => { claimed = true; } },
    addEventListener: (name, handler) => { listeners[name] = handler; }
  },
  caches: {
    keys: async () => ['bustamante-175-planos-2026-11', 'other-app', 'javier-prado-oeste-2168-old', `javier-prado-oeste-2168-${cacheName}`],
    delete: async key => { deleted.push(key); },
    open: async key => {
      assert.equal(key, `javier-prado-oeste-2168-${cacheName}`);
      return {
        addAll: async requests => { precached = requests.map(request => request.url); },
        match: async (_request, options) => {
          assert.equal(options?.ignoreVary, true);
          return cachedResponse;
        }
      };
    }
  }
});
let activation;
listeners.activate({ waitUntil: promise => { activation = promise; } });
await activation;
assert.deepEqual(deleted, ['javier-prado-oeste-2168-old']);
assert.ok(claimed);
for (const path of ['index.html', 'assets/example.js', 'content/project.json']) {
  let response;
  listeners.fetch({ request: { method: 'GET', url: `https://example.test/JP2168/${path}`, mode: path === 'index.html' ? 'navigate' : 'cors' }, respondWith: promise => { response = promise; } });
  assert.equal(await response, cachedResponse);
}
listeners.fetch({ request: { method: 'GET', url: 'https://example.test/Bustamante175/index.html' }, respondWith: () => assert.fail('Must ignore another project') });
for (const path of ['offline-cache-manifest.json', 'content/project.json']) {
  listeners.fetch({
    request: { method: 'GET', url: `https://example.test/JP2168/${path}?sync=1` },
    respondWith: () => assert.fail('Published updates must bypass the offline cache')
  });
}
const manifest = JSON.parse(fs.readFileSync('dist/offline-cache-manifest.json'));
const published = JSON.parse(fs.readFileSync('dist/content/project.json'));
assert.equal(manifest.buildRevision, cacheName);
assert.match(manifest.projectRevision, /^[a-f0-9]{64}$/);
assert.equal(published.publishedContentRevision, manifest.projectRevision);
let installation;
const install = () => {
  listeners.install({ waitUntil: promise => { installation = promise; } });
  return installation;
};
manifestResponse = Response.json({ ...manifest, buildRevision: 'another-build' });
await assert.rejects(install(), /does not match worker/);
assert.equal(skippedWaiting, false);
manifestResponse = Response.json(manifest);
await install();
assert.ok(skippedWaiting);
assert.ok(precached.includes('https://example.test/JP2168/content/project.json'));
for (const file of manifest.files.filter(file => file !== './')) assert.ok(fs.existsSync(`dist/${file}`), file);
for (const asset of ['arquitectura', 'cultura', 'espacios', 'gastronomia', 'mapa']) {
  assert.ok(manifest.files.includes(`content/location/${asset}.webp`));
}
assert.ok(fs.readFileSync('dist/index.html', 'utf8').includes('/JP2168/assets/'));
console.log('Project identity, cache isolation, offline fallback and Pages paths passed.');

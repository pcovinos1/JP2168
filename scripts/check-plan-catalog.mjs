import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const plans = JSON.parse(fs.readFileSync('src/data/jp2168Plans.json'));
const source = fs.readFileSync('src/data/migratePlans.ts', 'utf8')
  .replace('import plans from "./jp2168Plans.json";', `const plans = ${JSON.stringify(plans)};`)
  .replace('import { PROJECT_ID } from "./projectIdentity";', 'const PROJECT_ID = "javier-prado-oeste-2168";');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { migratePlans } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const project = JSON.parse(fs.readFileSync('public/content/project.json'));
assert.equal(project.id, 'javier-prado-oeste-2168');
assert.equal(plans.typologies.length, 14);
assert.equal(new Set(plans.typologies.map(plan => plan.id)).size, 14);
assert.deepEqual(plans.generalPlans.map(plan => plan.id), [
  'jp-planta-tipica', 'jp-sotano-01', 'jp-sotano-02', 'jp-sotano-03', 'jp-sotano-04',
  'jp-piso-1', 'jp-piso-2', 'jp-piso-3', 'jp-piso-14', 'jp-piso-15', 'jp-piso-16', 'jp-azotea'
]);
assert.equal(plans.typologies.filter(plan => plan.format === 'Duplex').length, 6);
assert.deepEqual(project.typologies, plans.typologies);
assert.deepEqual(project.generalPlans, plans.generalPlans);
assert.deepEqual(project.floorPlan, plans.floorPlan);
const inherited = { ...project, plansRevision: 'bustamante-planos-2026-11-08', name: 'Local edit', typologies: [{ id: 'old', planSrc: 'content/plans/bustamante/old.webp' }] };
const migrated = migratePlans(inherited);
assert.deepEqual(migrated.typologies, plans.typologies);
assert.equal(migrated.name, 'Local edit');
assert.equal(migrated.version, inherited.version);
assert.equal(inherited.typologies[0].id, 'old');
assert.equal(migratePlans(migrated), migrated);
assert.equal(migratePlans({ ...inherited, id: 'bustamante-175' }).typologies, inherited.typologies);
const customized = { ...project, typologies: [{ ...project.typologies[0], notes: 'Custom plan' }] };
assert.equal(migratePlans(customized), customized);
const previousAsset = src => src.replace('jp2168-2026-11-11/', 'jp2168-2026-11/');
const previous = {
  ...project,
  plansRevision: 'jp2168-planos-2026-11-08',
  typologies: [{
    ...project.typologies[0],
    planSrc: previousAsset(project.typologies[0].planSrc),
    thumbnailSrc: 'custom-thumbnail.webp',
    notes: 'Custom plan'
  }],
  generalPlans: project.generalPlans
    .filter(plan => !/^jp-piso-(2|3|14|15|16)$/.test(plan.id))
    .map(plan => ({ ...plan, planSrc: previousAsset(plan.planSrc) })),
  floorPlan: { ...project.floorPlan, imageSrc: previousAsset(project.floorPlan.imageSrc), hotspots: [{ id: 'local' }] }
};
const refreshed = migratePlans(previous);
assert.equal(refreshed.typologies[0].planSrc, plans.typologies[0].planSrc);
assert.equal(refreshed.typologies[0].thumbnailSrc, 'custom-thumbnail.webp');
assert.equal(refreshed.typologies[0].notes, 'Custom plan');
assert.deepEqual(refreshed.generalPlans, plans.generalPlans);
assert.equal(refreshed.floorPlan.imageSrc, plans.floorPlan.imageSrc);
assert.equal(refreshed.floorPlan.hotspots, previous.floorPlan.hotspots);
assert.equal(migratePlans(refreshed), refreshed);
for (const plan of [...plans.typologies, ...plans.generalPlans]) {
  for (const key of ['planSrc', 'thumbnailSrc', 'floorThumbnailSrc']) {
    if (plan[key]) {
      assert.ok(plan[key].startsWith('content/plans/jp2168-2026-11-11/'));
      assert.ok(fs.existsSync('public/' + plan[key]), plan[key]);
    }
  }
}
for (const typology of plans.typologies) assert.ok([2, 3].includes(typology.bedrooms));
assert.deepEqual([Math.min(...plans.typologies.map(p => p.areaM2)), Math.max(...plans.typologies.map(p => p.areaM2))], [80, 264]);
const offline = JSON.parse(fs.readFileSync('dist/offline-cache-manifest.json')).files;
for (const plan of [...plans.typologies, ...plans.generalPlans]) {
  for (const key of ['planSrc', 'thumbnailSrc', 'floorThumbnailSrc']) {
    if (plan[key]) assert.ok(offline.includes(plan[key]), `Missing offline asset: ${plan[key]}`);
  }
}
console.log('JP2168 catalogue, assets and one-time migration checks passed.');

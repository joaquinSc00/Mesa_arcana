import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
function walk(dir) {
  if (dir instanceof URL) dir = fileURLToPath(dir);
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);
}
test('native module graph resolves all local imports and has no cycles',()=> {
  const files=['app.js','map.js','game-system.js','firebase-config.js','v3-ui.js',...['core','domain','features','ui'].flatMap(dir=>walk(new URL(dir,root)))].map(file=>path.resolve(fileURLToPath(root),file));
  const graph=new Map();
  for(const file of files) {
    const imports=[...fs.readFileSync(file,'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match=>path.resolve(path.dirname(file),match[1].split('?')[0]));
    imports.forEach(target=>assert.ok(fs.existsSync(target),`missing ${target}`));graph.set(file,imports);
  }
  const done=new Set(),active=new Set();
  function visit(file) { assert.ok(!active.has(file),`cycle at ${file}`);if(done.has(file))return;active.add(file);(graph.get(file)||[]).forEach(visit);active.delete(file);done.add(file); }
  files.forEach(visit);
});
test('rules and actions do not depend on presentation or Firebase SDK references',()=> {
  for(const dir of ['domain','features'])for(const file of walk(new URL(dir,root))) {
    const code=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(code,/\b(document|window|roomRef)\b/,file);
    assert.doesNotMatch(code,/from ['"].*\/ui\//,file);
  }
});
test('all CSS entry imports resolve',()=> {
  for(const entry of ['styles.css','v3-ui.css']) {
    const imports=[...fs.readFileSync(new URL(entry,root),'utf8').matchAll(/@import url\("([^"]+)"\)/g)];
    assert.ok(imports.length>0);
    for(const match of imports)assert.ok(fs.existsSync(new URL(match[1],root)),match[1]);
  }
});

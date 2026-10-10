import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
for(const entry of ['styles.css','v3-ui.css']) {
  const imports=[...fs.readFileSync(entry,'utf8').matchAll(/@import url\("([^"]+)"\)/g)];
  const combined=imports.map(match=>fs.readFileSync(match[1],'utf8')).join('');
  const original=execFileSync('git',['show',`0e7a2bf:${entry}`],{encoding:'utf8'}).replace(/\r\n/g,'\n');
  assert.equal(combined,original);
  console.log(`${entry}: declarations and cascade match the pre-refactor version exactly.`);
}

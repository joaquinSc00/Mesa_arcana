import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'')
  .replace(/(<link\b[^>]*href=")((?!https?:)[^"]+)(")/g,'$1../$2$3')
  .replace('</body>','  <script type="module" src="role-client.js"></script>\n</body>');
fs.writeFileSync('tests/role.html',html);
console.log('Browser fixture generated from the current index.html.');

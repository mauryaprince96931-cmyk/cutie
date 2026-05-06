const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/noMode/g, 'nullMode');
content = content.replace(/No Mode 😏/g, 'Null 😏');
content = content.replace(/No Mode([ \w]*)/g, 'Null$1');
content = content.replace(/NO MODE/g, 'NULL');

fs.writeFileSync(path, content);
console.log('Replaced in App.tsx');

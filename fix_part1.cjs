const fs = require('fs');

const original = fs.readFileSync('src/components/SifproInventorySubmenu.tsx', 'utf8');
const fixed = original.replace(/<thead>\s*<thead>/, '<thead>');
fs.writeFileSync('src/components/SifproInventorySubmenu.tsx', fixed);

const fs = require('fs');
let insp = fs.readFileSync('src/features/inspector/InspectorPanel.tsx', 'utf8');
insp = insp.replace('value="database">Database<', 'value="database">Storage<');
fs.writeFileSync('src/features/inspector/InspectorPanel.tsx', insp);

let pal = fs.readFileSync('src/features/palette/paletteData.ts', 'utf8');
pal = pal.replace("title: 'Database'", "title: 'Storage'");
fs.writeFileSync('src/features/palette/paletteData.ts', pal);

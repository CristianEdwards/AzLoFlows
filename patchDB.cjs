const fs = require('fs');

function run() {
  let c = fs.readFileSync('src/features/palette/paletteData.ts', 'utf8');

  // Add type to the literal string
  c = c.replace(/'analyticsPanel';/, "'analyticsPanel' | 'database';");

  const dbIconStr = `const databaseIcon = \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
    <ellipse cx="32" cy="16" rx="20" ry="7" fill="rgba(0,229,255,0.06)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,16 v10 A20,7 0 0,0 52,26 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,26 v10 A20,7 0 0,0 52,36 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
    <path d="M12,36 v10 A20,7 0 0,0 52,46 v-10" fill="rgba(0,229,255,0.04)" stroke="rgba(0,229,255,0.6)" stroke-width="1.5"/>
</svg>\`;\n\n`;

  c = c.replace(/const gaugeIcon =/, dbIconStr + 'const gaugeIcon =');
  c = c.replace(/\{ id: 'gauge',/, "{ id: 'database', title: 'Database', icon: databaseIcon, nodeShape: 'database' },\n    { id: 'gauge',");

  fs.writeFileSync('src/features/palette/paletteData.ts', c);

  let insp = fs.readFileSync('src/features/inspector/InspectorPanel.tsx', 'utf8');
  insp = insp.replace(/<option value="gauge">Gauge<\/option>/, '<option value="database">Database</option>\n                  <option value="gauge">Gauge</option>');
  fs.writeFileSync('src/features/inspector/InspectorPanel.tsx', insp);
}
run();

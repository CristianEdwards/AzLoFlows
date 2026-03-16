const fs = require('fs');

function applyTextRatios(file, searchStr, replaceStr) {
  const p = 'src/features/canvas/renderers/' + file;
  let code = fs.readFileSync(p, 'utf8');
  if (code.includes('import { getTextRatios }')) return;
  code = "import { getTextRatios } from '@/lib/geometry/textPosition';\n" + code;
  code = code.replace(searchStr, replaceStr);
  fs.writeFileSync(p, code);
  console.log('patched ' + file);
}

// Diamond
applyTextRatios('renderDiamond.ts', 
  /const titlePoint = \{ x: center\.x, y: center\.y \+ 8 \* camera\.zoom \};/,
  "const textRatios = getTextRatios(node, 0.5);\n" +
  "    const dx = (textRatios.x - 0.5) * node.width * camera.zoom * 0.8;\n" +
  "    const dy = (textRatios.y - 0.5) * node.height * camera.zoom * 0.8;\n" +
  "    const titlePoint = { x: center.x + dx, y: center.y + dy + 8 * camera.zoom };"
);

// Hexagon 
applyTextRatios('renderHexagon.ts', 
  /const titlePoint = \{ x: cx, y: cy \+ 8 \* camera\.zoom \};/,
  "const textRatios = getTextRatios(node, 0.5);\n" +
  "    const dx = (textRatios.x - 0.5) * node.width * camera.zoom * 0.8;\n" +
  "    const dy = (textRatios.y - 0.5) * node.height * camera.zoom * 0.8;\n" +
  "    const titlePoint = { x: cx + dx, y: cy + dy + 8 * camera.zoom };"
);

// Laptop
applyTextRatios('renderLaptop.ts',
  /const titlePt = \{ x: screenCX, y: screenCY \+ screenH \* 0\.18 \};/,
  "const textRatios = getTextRatios(node, 0.48);\n" +
  "    const rx = (textRatios.x - 0.5) * screenW * 0.8;\n" +
  "    const ry = (textRatios.y - 0.48) * screenH * 0.8;\n" +
  "    const titlePt = { x: screenCX + rx, y: screenCY + ry + screenH * 0.18 };"
);

// Monitor
applyTextRatios('renderMonitor.ts',
  /const titlePt = \{ x: screenCX, y: titleY \};/,
  "const textRatios = getTextRatios(node, 0.48);\n" +
  "    const rx = (textRatios.x - 0.5) * screenW * 0.8;\n" +
  "    const ry = (textRatios.y - 0.48) * screenH * 0.6;\n" +
  "    const titlePt = { x: screenCX + rx, y: titleY + ry };"
);


const fs = require('fs');
const p = 'src/features/canvas/renderers/renderShield.ts';
let code = fs.readFileSync(p, 'utf8');
if (!code.includes('import { getTextRatios }')) {
  code = "import { getTextRatios } from '@/lib/geometry/textPosition';\n" + code;
  code = code.replace(
    /const titlePoint = \{ x: shieldCX, y: shieldCY \+ 8 \* camera\.zoom \};/,
    "const textRatios = getTextRatios(node, 0.5);\n" +
    "    const dx = (textRatios.x - 0.5) * node.width * camera.zoom * 0.8;\n" +
    "    const dy = (textRatios.y - 0.5) * node.height * camera.zoom * 0.8;\n" +
    "    const titlePoint = { x: shieldCX + dx, y: shieldCY + dy + 8 * camera.zoom };"
  );
  fs.writeFileSync(p, code);
  console.log('patched');
}

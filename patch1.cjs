const fs = require('fs');
const glob = require('fs').readdirSync('src/features/canvas/renderers');

for (const file of glob) {
  if (!file.endsWith('.ts')) continue;
  const p = 'src/features/canvas/renderers/' + file;
  let code = fs.readFileSync(p, 'utf8');
  let changed = false;

  if (code.includes('import { getTextRatios } from')) continue;

  const match1 = code.match(/\{ x: node\.x \+ node\.width \* 0\.5, y: node\.y \+ node\.height \* ([\d\.]+) \}/);
  if (match1) {
    const defaultY = match1[1];
    code = code.replace(
      /\{ x: node\.x \+ node\.width \* 0\.5, y: node\.y \+ node\.height \* [\d\.]+ \}/g,
      "{ x: node.x + node.width * textRatios.x, y: node.y + node.height * textRatios.y }"
    );
    if (!code.includes('const textRatios = getTextRatios(node,')) {
      code = code.replace(/const titlePoint =/, "const textRatios = getTextRatios(node, " + defaultY + ");\n  const titlePoint =");
    }
    changed = true;
  }
  
  if (code.includes('const titlePos = fp(0.5, 0.48);')) {
    code = code.replace('const titlePos = fp(0.5, 0.48);', 
      "const textRatios = getTextRatios(node, 0.48);\n  const titlePos = fp(textRatios.x, textRatios.y);");
    changed = true;
  }
  
  if (changed) {
    if (!code.includes('import { getTextRatios }')) {
      code = "import { getTextRatios } from '@/lib/geometry/textPosition';\n" + code;
    }
    fs.writeFileSync(p, code);
    console.log('patched ' + file);
  }
}

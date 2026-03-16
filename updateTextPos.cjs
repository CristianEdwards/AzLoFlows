const fs = require('fs');
const p = 'src/lib/geometry/textPosition.ts';
const newCode = "import type { NodeEntity } from '@/types/document';\n\nexport function getTextRatios(node: NodeEntity, defaultY: number = 0.46) {\n  const tp = node.textPosition || 'center';\n  switch (tp) {\n    case 'top-left': return { x: 0.12, y: 0.12 };\n    case 'top-center': return { x: 0.50, y: 0.12 };\n    case 'top-right': return { x: 0.88, y: 0.12 };\n    case 'bottom-left': return { x: 0.12, y: 0.88 };\n    case 'bottom-center': return { x: 0.50, y: 0.88 };\n    case 'bottom-right': return { x: 0.88, y: 0.88 };\n    case 'center':\n    default:\n      return { x: 0.5, y: defaultY };\n  }\n}\n";
fs.writeFileSync(p, newCode);
console.log('patched textPosition.ts');

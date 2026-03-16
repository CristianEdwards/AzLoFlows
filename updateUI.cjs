const fs = require('fs');
const p = 'src/features/inspector/InspectorPanel.tsx';
let code = fs.readFileSync(p, 'utf8');

const target = '<option value="top-left">Top Left</option>';
const repl = '<option value="top-left">Top Left</option>\n                  <option value="top-center">Top Center</option>';

const target2 = '<option value="bottom-left">Bottom Left</option>';
const repl2 = '<option value="bottom-left">Bottom Left</option>\n                  <option value="bottom-center">Bottom Center</option>';

code = code.replace(target, repl);
code = code.replace(target2, repl2);

fs.writeFileSync(p, code);
console.log('patched InspectorPanel.tsx');

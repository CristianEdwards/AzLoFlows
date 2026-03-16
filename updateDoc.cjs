const fs = require('fs');
const p = 'src/types/document.ts';
let code = fs.readFileSync(p, 'utf8');

const target = "    textPosition?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';";
const repl = "    textPosition?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';";

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(p, code);
  console.log('patched document.ts');
} else {
  console.log('could not find target in document.ts');
}

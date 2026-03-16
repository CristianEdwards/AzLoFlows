const fs = require('fs');
const p = 'src/features/inspector/InspectorPanel.tsx';
let c = fs.readFileSync(p, 'utf8');

const replacement = '<label className="field">\n                <span>Text Position</span>\n                <select value={selectedNode.textPosition || "center"} onChange={(event) => updateNode(selectedNode.id, { textPosition: event.target.value as any })}>\n                  <option value="center">Center</option>\n                  <option value="top-left">Top Left</option>\n                  <option value="top-right">Top Right</option>\n                  <option value="bottom-left">Bottom Left</option>\n                  <option value="bottom-right">Bottom Right</option>\n                </select>\n              </label>\n              <label className="field">\n                <span>Icon</span>\n                <select value={selectedNode.icon || ""}';

c = c.replace(/<label className="field">\r?\n\s*<span>Icon<\/span>\r?\n\s*<select value=\{selectedNode\.icon \?\? ''\}/, replacement);

fs.writeFileSync(p, c);
console.log('updated');

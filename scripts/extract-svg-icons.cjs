const fs = require('fs');
const path = require('path');

const TARGET = 32;

const files = [
  { file: 'Arc gateway.svg', id: 'svgArcGateway', label: 'Arc Gateway (Azure)' },
  { file: 'ArcResourceBridge.svg', id: 'svgArcResourceBridge', label: 'Arc Resource Bridge (Azure)' },
  { file: 'azure.svg', id: 'svgAzure', label: 'Azure (Official)' },
  { file: 'AzureFirewall.svg', id: 'svgAzureFirewall', label: 'Azure Firewall (Official)' },
  { file: 'AzureFirewallPolicy.svg', id: 'svgAzureFirewallPolicy', label: 'Firewall Policy (Official)' },
  { file: 'AzureLocalAKS.svg', id: 'svgAzureLocalAKS', label: 'AKS Azure Local (Official)' },
  { file: 'AzureLocalCluster.svg', id: 'svgAzureLocalCluster', label: 'Azure Local Cluster (Official)' },
  { file: 'AzureLocalLNET.svg', id: 'svgAzureLocalLNET', label: 'LNET Azure Local (Official)' },
  { file: 'AzureLocalMachine.svg', id: 'svgAzureLocalMachine', label: 'Azure Local Machine (Official)' },
  { file: 'AzureLocalVM.svg', id: 'svgAzureLocalVM', label: 'VM Azure Local (Official)' },
  { file: 'DNs.svg', id: 'svgDns', label: 'DNS (Official)' },
  { file: 'ExpressRoutecircuits.svg', id: 'svgExpressRoute', label: 'ExpressRoute (Official)' },
  { file: 'KeyVault.svg', id: 'svgKeyVault', label: 'Key Vault (Official)' },
  { file: 'LNET.svg', id: 'svgLnet', label: 'LNET (Official)' },
  { file: 'privateendpoints.svg', id: 'svgPrivateEndpoint', label: 'Private Endpoint (Official)' },
  { file: 'VNET.svg', id: 'svgVnet', label: 'VNET (Official)' },
];

function getViewBox(svg) {
  const m = svg.match(/viewBox="([^"]+)"/);
  if (!m) return null;
  const [x, y, w, h] = m[1].trim().split(/[\s,]+/).map(Number);
  return { x, y, w, h };
}

function extractPathDs(svg) {
  const ds = [];
  const pathEls = svg.match(/<path[^>]+>/g) || [];
  for (const el of pathEls) {
    const dm = el.match(/\bd="([^"]+)"/);
    if (dm) ds.push(dm[1]);
  }
  const circleRe = /<circle[^>]+>/g;
  let cm;
  while ((cm = circleRe.exec(svg)) !== null) {
    const cxM = cm[0].match(/cx="([\d.]+)"/);
    const cyM = cm[0].match(/cy="([\d.]+)"/);
    const rM = cm[0].match(/\br="([\d.]+)"/);
    if (cxM && cyM && rM) {
      const cx = parseFloat(cxM[1]), cy = parseFloat(cyM[1]), r = parseFloat(rM[1]);
      ds.push(`M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`);
    }
  }
  const rectRe = /<rect[^>]+>/g;
  let rm2;
  while ((rm2 = rectRe.exec(svg)) !== null) {
    const xM = rm2[0].match(/\bx="([\d.]+)"/);
    const yM = rm2[0].match(/\by="([\d.]+)"/);
    const wM = rm2[0].match(/width="([\d.]+)"/);
    const hM = rm2[0].match(/height="([\d.]+)"/);
    if (wM && hM) {
      const rx = xM ? xM[1] : '0';
      const ry = yM ? yM[1] : '0';
      ds.push(`M${rx} ${ry}h${wM[1]}v${hM[1]}h-${wM[1]}z`);
    }
  }
  return ds;
}

function parsePath(d) {
  const cmds = [];
  const tokens = d.match(/[a-zA-Z]|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g);
  if (!tokens) return cmds;

  let currentCmd = null;
  let nums = [];

  const argCounts = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

  function flush() {
    if (currentCmd !== null && nums.length > 0) {
      cmds.push({ cmd: currentCmd, args: [...nums] });
      nums = [];
    } else if (currentCmd !== null && (currentCmd.toUpperCase() === 'Z')) {
      cmds.push({ cmd: currentCmd, args: [] });
    }
  }

  for (const t of tokens) {
    if (/^[a-zA-Z]$/.test(t)) {
      flush();
      currentCmd = t;
      if (t.toUpperCase() === 'Z') {
        cmds.push({ cmd: t, args: [] });
        currentCmd = null;
      }
    } else {
      nums.push(parseFloat(t));
      const upper = currentCmd ? currentCmd.toUpperCase() : '';
      const needed = argCounts[upper] || 0;
      if (needed > 0 && nums.length >= needed) {
        cmds.push({ cmd: currentCmd, args: [...nums] });
        nums = [];
        if (currentCmd === 'M') currentCmd = 'L';
        else if (currentCmd === 'm') currentCmd = 'l';
      }
    }
  }
  if (currentCmd && nums.length > 0) {
    cmds.push({ cmd: currentCmd, args: [...nums] });
  }
  return cmds;
}

function r(n) { return Math.round(n * 100) / 100; }

function scaleParsedPath(cmds, s) {
  return cmds.map(({ cmd, args }) => {
    const upper = cmd.toUpperCase();
    let scaled;
    switch (upper) {
      case 'M': case 'L': case 'T':
        scaled = [r(args[0] * s), r(args[1] * s)];
        break;
      case 'H':
        scaled = [r(args[0] * s)];
        break;
      case 'V':
        scaled = [r(args[0] * s)];
        break;
      case 'C':
        scaled = args.map((a, i) => r(a * s));
        break;
      case 'S': case 'Q':
        scaled = args.map((a, i) => r(a * s));
        break;
      case 'A':
        // rx ry rotation large-arc sweep x y
        if (args.length >= 7)
          scaled = [r(args[0] * s), r(args[1] * s), args[2], args[3], args[4], r(args[5] * s), r(args[6] * s)];
        else
          scaled = args;
        break;
      case 'Z':
        scaled = [];
        break;
      default:
        scaled = args.map(a => r(a * s));
    }
    return cmd + scaled.join(' ');
  }).join('');
}

const iconsDir = path.join(process.cwd(), 'Icons');
const output = [];

for (const icon of files) {
  try {
    const svg = fs.readFileSync(path.join(iconsDir, icon.file), 'utf-8');
    const vb = getViewBox(svg);
    if (!vb) { output.push(`// ${icon.file}: no viewBox`); continue; }
    const s = TARGET / Math.max(vb.w, vb.h);
    const ds = extractPathDs(svg);
    const scaledPaths = ds.map(d => {
      const cmds = parsePath(d);
      return scaleParsedPath(cmds, s);
    });

    output.push(`  ${icon.id}: {`);
    output.push(`    label: '${icon.label}',`);
    output.push(`    paths: [`);
    for (const p of scaledPaths) {
      output.push(`      '${p.replace(/'/g, "\\'")}',`);
    }
    output.push(`    ],`);
    output.push(`  },`);
  } catch (e) {
    output.push(`// ${icon.file}: error - ${e.message}`);
  }
}

console.log(output.join('\n'));

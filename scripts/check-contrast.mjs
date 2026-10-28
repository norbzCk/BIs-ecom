#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const toLin = (c) => {
    const cs = c / 255;
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
  };
  const R = toLin(r);
  const G = toLin(g);
  const B = toLin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrast(c1, c2) {
  const L1 = luminance(c1);
  const L2 = luminance(c2);
  const bright = Math.max(L1, L2);
  const dark = Math.min(L1, L2);
  return (bright + 0.05) / (dark + 0.05);
}

function parseVars(css) {
  const vars = {};
  const regex = /--([a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = regex.exec(css)) !== null) {
    let val = m[2].trim();
    val = val.replace(/\/\*.*?\*\//g, '').trim();
    // resolve simple var() references
    vars[m[1]] = val;
  }
  return vars;
}

function resolve(val, vars, depth = 0) {
  if (depth > 10) return val;
  const m = val.match(/var\(--([a-zA-Z0-9-]+)\)/);
  if (m) {
    const inner = vars[m[1]] || '';
    return resolve(inner, vars, depth + 1);
  }
  return val;
}

function extractHex(val) {
  const m = val.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/);
  if (m) {
    return '#' + m[1].toLowerCase();
  }
  // rgb
  const rm = val.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rm) {
    const r = parseInt(rm[1]), g = parseInt(rm[2]), b = parseInt(rm[3]);
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  }
  return null;
}

function getVar(vars, name) {
  const val = resolve(vars[name] || '', vars);
  return extractHex(val);
}

function main() {
  const themePath = path.resolve(process.cwd(), 'apps/web/src/styles/theme.css');
  const css = fs.readFileSync(themePath, 'utf8');
  const vars = parseVars(css);
  
  const pairs = [
    { name: 'text on bg', fg: getVar(vars, 'color-text'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'text on surface', fg: getVar(vars, 'color-text'), bg: getVar(vars, 'color-surface'), need: 4.5 },
    { name: 'text-muted on bg', fg: getVar(vars, 'color-text-muted'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'text-muted on surface', fg: getVar(vars, 'color-text-muted'), bg: getVar(vars, 'color-surface'), need: 4.5 },
    { name: 'muted on header', fg: getVar(vars, 'color-text-muted'), bg: getVar(vars, 'color-header-bg'), need: 4.5 },
    { name: 'primary-button text on primary', fg: getVar(vars, 'color-primary-text'), bg: getVar(vars, 'color-primary'), need: 4.5 },
    { name: 'price on bg', fg: getVar(vars, 'color-price'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'price on surface', fg: getVar(vars, 'color-price'), bg: getVar(vars, 'color-surface'), need: 4.5 },
    { name: 'accent-text on bg', fg: getVar(vars, 'color-accent-text'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'accent-text on surface', fg: getVar(vars, 'color-accent-text'), bg: getVar(vars, 'color-surface'), need: 4.5 },
    { name: 'accent-text on header', fg: getVar(vars, 'color-accent-text'), bg: getVar(vars, 'color-header-bg'), need: 4.5 },
    { name: 'link on bg', fg: getVar(vars, 'color-link'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'header text on header-bg', fg: getVar(vars, 'color-text'), bg: getVar(vars, 'color-header-bg'), need: 4.5 },
    { name: 'footer text on footer-bg', fg: getVar(vars, 'color-text'), bg: getVar(vars, 'color-footer-bg'), need: 4.5 },
    { name: 'success on bg', fg: getVar(vars, 'color-success'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'danger on bg', fg: getVar(vars, 'color-danger'), bg: getVar(vars, 'color-bg'), need: 4.5 },
    { name: 'white on cta', fg: getVar(vars, 'color-cta-text'), bg: getVar(vars, 'color-cta'), need: 4.5 },
  ];
  
  let failed = false;
  console.log('| Pair | FG | BG | Ratio | Required | Status |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const p of pairs) {
    if (!p.fg || !p.bg) {
      console.log(`| ${p.name} | ${p.fg || 'MISSING'} | ${p.bg || 'MISSING'} | - | ${p.need}:1 | FAIL |`);
      failed = true;
      continue;
    }
    const ratio = contrast(p.fg, p.bg);
    const pass = ratio >= p.need;
    if (!pass) failed = true;
    console.log(`| ${p.name} | ${p.fg} | ${p.bg} | ${ratio.toFixed(2)}:1 | ${p.need}:1 | ${pass ? 'PASS' : 'FAIL'} |`);
  }
  
  if (failed) {
    process.exit(1);
  }
}

main();

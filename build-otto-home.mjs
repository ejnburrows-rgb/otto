import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_INDEX = new URL('./index.html', import.meta.url);

export function patchSource(source) {
  let out = source;

  const replacements = [
    ["{ id: 'owner-2', name: 'Julio', role: 'owner'", "{ id: 'owner-2', name: 'Julio Pablo', role: 'owner'"],
    ["{ id: 'ops-1', name: 'Saray', role: 'office'", "{ id: 'ops-1', name: 'Sarays', role: 'office'"],
    ["fixUser('owner-2', 'Julio');", "fixUser('owner-2', 'Julio Pablo');"],
    ["fixUser('ops-1', 'Saray');", "fixUser('ops-1', 'Sarays');"],
    ['PlumbBot AI Assistant', 'Ask OTTO'],
    ['Online · Boss-Level Intelligence', 'Assistant'],
    ["Hello Boss! I'm PlumbBot. How can I assist you with estimates, crew dispatch, margin calculation, or job analytics today?", "Hi. Ask OTTO about today's work, jobs, estimates, payroll, or company records."],
    ['Ask PlumbBot anything...', 'Ask OTTO…'],
    ['PlumbBot AI here! I analyzed', 'OTTO received'],
    ['All systems operational. Margins and dispatch are synchronized for maximum efficiency, Boss!', 'I will use the information available in OTTO and will not invent operational status.'],
    ['Field crew status: All active jobs are mapped and tracked in real-time. No delays reported today!', 'Open Field Workers to see the current information OTTO actually has for the crew.']
  ];

  for (const [from, to] of replacements) out = out.split(from).join(to);

  if (!out.includes('data-otto-home-styles')) {
    const link = '  <link rel="stylesheet" href="./otto-home.css" data-otto-home-styles />\n';
    if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
    out = out.replace('</head>', `${link}</head>`);
  }

  if (!out.includes('data-otto-home-runtime')) {
    const script = '  <script src="./otto-home.js" data-otto-home-runtime></script>\n';
    if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
    out = out.replace('</body>', `${script}</body>`);
  }

  return out;
}

export function validatePatchedSource(source) {
  return [
    ['Julio Pablo canonical seed', source.includes("id: 'owner-2', name: 'Julio Pablo'")],
    ['Sarays canonical seed', source.includes("id: 'ops-1', name: 'Sarays'")],
    ['Julio Pablo migration', source.includes("fixUser('owner-2', 'Julio Pablo');")],
    ['Sarays migration', source.includes("fixUser('ops-1', 'Sarays');")],
    ['minimal home stylesheet wired', source.includes('data-otto-home-styles')],
    ['minimal home runtime wired', source.includes('data-otto-home-runtime')],
    ['legacy Boss-Level copy removed', !source.includes('Boss-Level Intelligence')],
    ['legacy PlumbBot heading removed', !source.includes('PlumbBot AI Assistant')]
  ];
}

function run() {
  const path = fileURLToPath(ROOT_INDEX);
  const before = fs.readFileSync(path, 'utf8');
  const after = patchSource(before);
  const failed = validatePatchedSource(after).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`OTTO home patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (after !== before) fs.writeFileSync(path, after);
  console.log(`OTTO home patch: ${after === before ? 'already applied' : 'applied and validated'}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();

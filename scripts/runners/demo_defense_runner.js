#!/usr/bin/env node
/**
 * BukSU CMS-V2 Defense Hearing Dry-Run & Demonstration Orchestrator
 * Quick verification dashboard for panel defense rehearsal.
 */

import http from 'http';

const ANSI = {
  cyan: '\x1b[1;96m',
  green: '\x1b[92m',
  yellow: '\x1b[93m',
  red: '\x1b[91m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const SERVICES = [
  { name: 'Frontend Client (Vite)', host: 'localhost', port: 43211, path: '/login' },
  { name: 'API Server (Express)', host: 'localhost', port: 43210, path: '/api/health' },
  { name: 'Plagiarism ML Engine', host: 'localhost', port: 8001, path: '/health' },
];

function checkService(service) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: service.host, port: service.port, path: service.path, timeout: 3000 },
      (res) =>
        resolve({
          name: service.name,
          port: service.port,
          ok: res.statusCode < 500,
          status: res.statusCode,
        }),
    );
    req.on('error', () =>
      resolve({ name: service.name, port: service.port, ok: false, status: 'DOWN' }),
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ name: service.name, port: service.port, ok: false, status: 'TIMEOUT' });
    });
  });
}

async function main() {
  console.log(
    `\n${ANSI.cyan}====================================================================${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}  🎓 BUKSU CMS-V2 LIVE DEFENSE DRY-RUN & SYSTEM ORCHESTRATOR        ${ANSI.reset}`,
  );
  console.log(
    `${ANSI.cyan}====================================================================${ANSI.reset}\n`,
  );

  console.log(`${ANSI.bold}Checking Subsystem Health:${ANSI.reset}`);
  const checks = await Promise.all(SERVICES.map(checkService));

  for (const c of checks) {
    const badge = c.ok
      ? `${ANSI.green}ONLINE (HTTP ${c.status})${ANSI.reset}`
      : `${ANSI.red}OFFLINE (${c.status})${ANSI.reset}`;
    console.log(`  * ${c.name.padEnd(26)} [:${c.port}] -> ${badge}`);
  }

  console.log(`\n${ANSI.bold}Demo User Roles & Fast-Login Credentials:${ANSI.reset}`);
  console.log(
    `  1. ${ANSI.cyan}REC Chair:${ANSI.reset}         chair@buksu.edu.ph       | Password123!`,
  );
  console.log(
    `  2. ${ANSI.cyan}Panel Member 1:${ANSI.reset}    panelist1@buksu.edu.ph   | Password123!`,
  );
  console.log(
    `  3. ${ANSI.cyan}Panel Member 2:${ANSI.reset}    panelist2@buksu.edu.ph   | Password123!`,
  );
  console.log(
    `  4. ${ANSI.cyan}Coordinator:${ANSI.reset}       coordinator@buksu.edu.ph | Password123!`,
  );
  console.log(
    `  5. ${ANSI.cyan}Student Lead:${ANSI.reset}      student@buksu.edu.ph     | Password123!`,
  );

  console.log(`\n${ANSI.bold}Key Panel Demonstration Sequence (Action Done Matrix):${ANSI.reset}`);
  console.log(
    `  [Step 1] ${ANSI.yellow}Team Lock Status:${ANSI.reset}     Navigate to /projects -> Inspect top Emerald/Crimson banner.`,
  );
  console.log(
    `  [Step 2] ${ANSI.yellow}Plagiarism Engine:${ANSI.reset}    Navigate to /submissions -> Test Winnowing vs. Semantic tabs.`,
  );
  console.log(
    `  [Step 3] ${ANSI.yellow}PDF Annotations:${ANSI.reset}      Navigate to /documents -> Highlight manuscript canvas.`,
  );
  console.log(
    `  [Step 4] ${ANSI.yellow}ADM Digital Sign-Off:${ANSI.reset} Navigate to /projects/revisions -> Draw canvas signature.`,
  );
  console.log(
    `  [Step 5] ${ANSI.yellow}Public Search Stream:${ANSI.reset} Navigate to /archive -> Stream approved PDF from S3.`,
  );

  console.log(
    `\n${ANSI.cyan}====================================================================${ANSI.reset}\n`,
  );
}

main();

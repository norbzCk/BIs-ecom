#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Runs the Prisma CLI and retries transient connection failures.
 *
 * Supabase's session pooler intermittently refuses cold connections with
 * P1001 "Can't reach database server", which makes `migrate`/`db` commands
 * look randomly flaky. Genuine errors (P2002 unique violation, P2003 foreign
 * key, schema validation) are never retried, so real failures still surface
 * immediately with their original exit code.
 *
 * Override with PRISMA_RETRY_ATTEMPTS and PRISMA_RETRY_DELAY_MS.
 */
const RETRYABLE = [
  /P1001/,
  /P1017/,
  /Can'?t reach database server/i,
  /Network is unreachable/i,
  /Connection reset by peer/i,
  /server closed the connection/i,
  /terminating connection/i,
  /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN/,
];

const MAX_ATTEMPTS = Number(process.env.PRISMA_RETRY_ATTEMPTS ?? 5);
const BASE_DELAY_MS = Number(process.env.PRISMA_RETRY_DELAY_MS ?? 2000);
const MAX_DELAY_MS = 20_000;

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('usage: node scripts/prisma-retry.mjs <prisma args...>');
  process.exit(2);
}

const localBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma');
const bin = existsSync(localBin) ? localBin : 'prisma';

const isRetryable = (output) => RETRYABLE.some((pattern) => pattern.test(output));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runPrisma() {
  return new Promise((resolve) => {
    // stdin stays inherited so interactive prompts (migrate dev asking for a
    // migration name) still work, while stdout/stderr are captured so the
    // output can be classified before deciding to retry.
    const child = spawn(bin, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: process.env,
    });

    let output = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      output += String(error);
      resolve({ code: 1, output });
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, output });
    });
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const { code, output } = await runPrisma();

  if (code === 0) {
    process.exit(0);
  }

  if (!isRetryable(output)) {
    process.exit(code);
  }

  if (attempt === MAX_ATTEMPTS) {
    console.error(
      `\n[prisma-retry] database still unreachable after ${MAX_ATTEMPTS} attempts.`,
    );
    process.exit(code);
  }

  const delay = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  console.error(
    `\n[prisma-retry] transient connection failure (attempt ${attempt}/${MAX_ATTEMPTS}), retrying in ${delay / 1000}s...`,
  );
  await sleep(delay);
}

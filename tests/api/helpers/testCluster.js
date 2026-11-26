import { spawn, execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE = path.resolve(__dirname, '../../..');

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitUntil(checkFn, timeoutMs = 12000, intervalMs = 200) {
  const start = Date.now();
  let lastError;
  while (Date.now() - start < timeoutMs) {
    try {
      const result = await checkFn();
      if (result) return result;
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }
  throw lastError || new Error(`Timeout após ${timeoutMs}ms aguardando condição`);
}

export async function waitForHealth(url, timeoutMs = 15000) {
  await waitUntil(async () => {
    const res = await fetch(url);
    return res.ok;
  }, timeoutMs, 150);
}

export function createTestCluster(portBase = 4300) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsw3-jest-'));
  const prodDb = path.join(tempDir, 'produtos.db');
  const pedDb = path.join(tempDir, 'pedidos.db');
  const qryDb = path.join(tempDir, 'query.db');
  const brokerDataDir = path.join(tempDir, 'broker-data');
  fs.mkdirSync(brokerDataDir, { recursive: true });

  const ports = {
    produtos: portBase + 1,
    pedidos: portBase + 2,
    broker: portBase + 3,
    query: portBase + 4
  };

  const urls = {
    produtos: `http://localhost:${ports.produtos}`,
    pedidos: `http://localhost:${ports.pedidos}`,
    broker: `http://localhost:${ports.broker}`,
    query: `http://localhost:${ports.query}`
  };

  const serviceConfigs = {
    'event-broker': {
      dir: 'event-broker',
      healthUrl: `${urls.broker}/health`,
      env: {
        PORT: String(ports.broker),
        DATA_DIR: brokerDataDir
      }
    },
    'ms-produtos': {
      dir: 'ms-produtos',
      healthUrl: `${urls.produtos}/health`,
      env: {
        PORT: String(ports.produtos),
        DATABASE_URL: `file:${prodDb}`,
        BROKER_URL: urls.broker,
        SERVICE_URL: urls.produtos
      }
    },
    'ms-pedidos': {
      dir: 'ms-pedidos',
      healthUrl: `${urls.pedidos}/health`,
      env: {
        PORT: String(ports.pedidos),
        DATABASE_URL: `file:${pedDb}`,
        PRODUTOS_SERVICE_URL: urls.produtos,
        BROKER_URL: urls.broker,
        SERVICE_URL: urls.pedidos,
        USE_CACHE_FALLBACK: 'true'
      }
    },
    'ms-query': {
      dir: 'ms-query',
      healthUrl: `${urls.query}/health`,
      env: {
        PORT: String(ports.query),
        DATABASE_URL: `file:${qryDb}`,
        BROKER_URL: urls.broker,
        SERVICE_URL: urls.query,
        PRODUTOS_SERVICE_URL: urls.produtos,
        PEDIDOS_SERVICE_URL: urls.pedidos
      }
    }
  };

  const processes = new Map();
  let schemaPrepared = false;

  function prepareDatabases() {
    if (schemaPrepared) return;
    const targets = [
      { dir: 'ms-produtos', db: prodDb },
      { dir: 'ms-pedidos', db: pedDb },
      { dir: 'ms-query', db: qryDb }
    ];

    for (const { dir, db } of targets) {
      execSync('npx prisma db push --skip-generate', {
        cwd: path.join(WORKSPACE, dir),
        env: { ...process.env, DATABASE_URL: `file:${db}` },
        stdio: 'pipe'
      });
    }
    schemaPrepared = true;
  }

  async function startService(name) {
    if (processes.has(name)) {
      const existing = processes.get(name);
      if (existing.exitCode === null && !existing.killed) {
        return existing;
      }
    }

    const cfg = serviceConfigs[name];
    if (!cfg) throw new Error(`Serviço desconhecido: ${name}`);

    const proc = spawn('node', ['src/server.js'], {
      cwd: path.join(WORKSPACE, cfg.dir),
      env: { ...process.env, ...cfg.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const logs = [];
    proc.stdout.on('data', (chunk) => logs.push(chunk.toString()));
    proc.stderr.on('data', (chunk) => logs.push(chunk.toString()));
    proc._testLogs = logs;

    processes.set(name, proc);
    await waitForHealth(cfg.healthUrl);
    return proc;
  }

  async function stopService(name) {
    const proc = processes.get(name);
    if (!proc) return;
    processes.delete(name);

    if (proc.killed || proc.exitCode !== null) return;
    proc.kill('SIGTERM');

    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          proc.kill('SIGKILL');
        } catch {}
        resolve();
      }, 2500);
      proc.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async function startAll() {
    prepareDatabases();
    await startService('event-broker');
    await startService('ms-produtos');
    await startService('ms-pedidos');
    await startService('ms-query');
    await sleep(600);
  }

  async function stopAll() {
    for (const name of ['ms-query', 'ms-pedidos', 'ms-produtos', 'event-broker']) {
      await stopService(name);
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  return {
    urls,
    ports,
    startAll,
    stopAll,
    startService,
    stopService,
    waitForHealth,
    waitUntil,
    sleep
  };
}

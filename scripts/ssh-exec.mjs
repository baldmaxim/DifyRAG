import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'ssh2';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const vars = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('Usage: node ssh-exec.mjs "<remote command>"');
  process.exit(1);
}

const conn = new Client();
conn
  .on('ready', () => {
    conn.exec(command, (err, stream) => {
      if (err) {
        console.error(err.message);
        conn.end();
        process.exit(1);
      }
      let code = 0;
      stream
        .on('close', (exitCode) => {
          conn.end();
          process.exit(exitCode ?? code);
        })
        .on('data', (data) => process.stdout.write(data))
        .stderr.on('data', (data) => process.stderr.write(data));
    });
  })
  .on('error', (err) => {
    console.error(err.message);
    process.exit(1);
  })
  .connect({
    host: vars.SSH_IP,
    port: Number(vars.SSH_PORT || 22),
    username: vars.SSH_USER,
    password: vars.SSH_PASSWORD,
    readyTimeout: 20000,
  });

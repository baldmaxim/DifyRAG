import { readFileSync, existsSync } from 'node:fs';
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

const command = process.argv[2];
const localFile = process.argv[3];
const remotePath = process.argv[4];

if (!command) {
  console.error('Usage: node ssh-deploy.mjs exec "<command>" | put <local> <remote>');
  process.exit(1);
}

const conn = new Client();
conn
  .on('ready', () => {
    if (command === 'exec') {
      const remoteCmd = process.argv.slice(3).join(' ');
      conn.exec(remoteCmd, (err, stream) => {
        if (err) {
          console.error(err.message);
          conn.end();
          process.exit(1);
        }
        stream
          .on('close', (code) => {
            conn.end();
            process.exit(code ?? 0);
          })
          .on('data', (d) => process.stdout.write(d))
          .stderr.on('data', (d) => process.stderr.write(d));
      });
      return;
    }

    if (command === 'put') {
      if (!existsSync(localFile)) {
        console.error(`Local file not found: ${localFile}`);
        conn.end();
        process.exit(1);
      }
      const content = readFileSync(localFile);
      conn.sftp((err, sftp) => {
        if (err) {
          console.error(err.message);
          conn.end();
          process.exit(1);
        }
        const stream = sftp.createWriteStream(remotePath);
        stream.on('close', () => {
          conn.end();
          process.exit(0);
        });
        stream.on('error', (e) => {
          console.error(e.message);
          conn.end();
          process.exit(1);
        });
        stream.end(content);
      });
      return;
    }

    console.error(`Unknown command: ${command}`);
    conn.end();
    process.exit(1);
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
    readyTimeout: 30000,
  });

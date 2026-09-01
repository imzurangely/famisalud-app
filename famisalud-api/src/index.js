import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';

const server = app.listen(env.PORT, () => {
  console.log(`FamiSalud API ejecutándose en http://localhost:${env.PORT}`);
});

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando servidor...`);

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

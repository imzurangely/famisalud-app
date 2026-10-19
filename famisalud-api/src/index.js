import cron from 'node-cron';
import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/database.js';
import { runDailyProcessSweep } from './modules/medication-process/medicationProcess.cron.js';
import { runReminderSweep } from './modules/reminders/reminder.cron.js';
import { expireInvitationsSweep } from './modules/family-invitations/familyInvitation.service.js';

const server = app.listen(env.PORT, () => {
  console.log(`FamiSalud API ejecutándose en http://localhost:${env.PORT}`);
});

// Barrido diario del módulo de Trámites de Medicamentos: aplica las
// transiciones de estado que dependen de la fecha (PROGRAMADA ->
// RENOVACION_PENDIENTE, vencimiento -> PERDIDA) y envía las notificaciones
// correspondientes. Corre solo, todos los días a la 1:00 a.m. hora de
// Bogotá, sin que nadie tenga que llamarlo.
const dailySweepTask = cron.schedule(
  '0 1 * * *',
  () => {
    runDailyProcessSweep().catch((error) => {
      console.error('[cron] Error en el barrido diario de trámites:', error);
    });
  },
  { timezone: 'America/Bogota' }
);

// Barrido de recordatorios: revisa cada minuto las tomas de medicamentos y
// las citas que están entrando en su ventana de recordatorio.
const invitationExpiryTask = cron.schedule(
  '*/15 * * * *',
  () => {
    expireInvitationsSweep().catch((error) => {
      console.error('[cron] Error al expirar invitaciones familiares:', error);
    });
  },
  { timezone: 'America/Bogota' }
);

const reminderSweepTask = cron.schedule(
  '* * * * *',
  () => {
    runReminderSweep().catch((error) => {
      console.error('[cron] Error en el barrido de recordatorios:', error);
    });
  },
  { timezone: 'America/Bogota' }
);

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando servidor...`);

  dailySweepTask.stop();
  invitationExpiryTask.stop();
  reminderSweepTask.stop();

  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
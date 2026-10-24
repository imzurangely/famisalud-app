import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { expireInvitationsSweep } from '../family-invitations/familyInvitation.service.js';
import { runDailyProcessSweep } from '../medication-process/medicationProcess.cron.js';
import { runReminderSweep } from '../reminders/reminder.cron.js';

const router = Router();

function authorizeCron(req, res, next) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({
      success: false,
      message: 'Las tareas programadas no están configuradas en este entorno.',
    });
  }

  const authHeader = req.get('authorization') || '';
  const received = Buffer.from(authHeader, 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');

  // Validamos longitud y seguridad para evitar ataques de tiempo
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return res.status(401).json({ success: false, message: 'No autorizado.' });
  }

  return next();
}

function cronHandler(name, task) {
  return async (_req, res, next) => {
    try {
      const result = await task();
      return res.status(200).json({ success: true, job: name, result });
    } catch (error) {
      return next(error);
    }
  };
}

// Ejecutar desde un programador externo cada minuto (también puede usarse en Vercel Pro).
router.get(
  '/internal/cron/reminders',
  authorizeCron,
  cronHandler('reminders', () => runReminderSweep()),
);

// Vercel Hobby puede ejecutar este trabajo una vez al día. Las expresiones de Vercel usan UTC.
router.get('/internal/cron/daily', authorizeCron, async (_req, res, next) => {
  try {
    const medicationProcesses = await runDailyProcessSweep();
    const expiredInvitations = await expireInvitationsSweep();
    return res.status(200).json({
      success: true,
      job: 'daily',
      result: { medicationProcesses, expiredInvitations },
    });
  } catch (error) {
    return next(error);
  }
});

router.get(
  '/internal/cron/invitations',
  authorizeCron,
  cronHandler('invitations', () => expireInvitationsSweep()),
);

export default router;
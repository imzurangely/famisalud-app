import nodemailer from 'nodemailer';
import { env } from './env.js';
import { AppError } from '../shared/utils/AppError.js';

function isConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

export async function sendPasswordResetEmail({ to, firstName, code }) {
  if (!isConfigured()) {
    throw new AppError('El servicio de correo no está configurado.', 503);
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject: 'Código para recuperar tu contraseña de FamiSalud',
    text: `Hola ${firstName},\n\nTu código para restablecer la contraseña es: ${code}\n\nEl código vence en 10 minutos y solo puede utilizarse una vez. Si no solicitaste este cambio, ignora este correo.`,
    html: `<p>Hola ${escapeHtml(firstName)},</p><p>Tu código para restablecer la contraseña es:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${code}</p><p>El código vence en 10 minutos y solo puede utilizarse una vez.</p><p>Si no solicitaste este cambio, ignora este correo.</p>`
  });
}

export function hasSmtpConfiguration() {
  return isConfigured();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export async function sendFamilyInvitationEmail({ to, inviteeName, inviterName, familyName, inviteUrl, expiresAt }) {
  if (!isConfigured()) {
    throw new AppError('El servicio de correo no está configurado.', 503);
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });

  const greeting = inviteeName ? `Hola ${inviteeName}` : 'Hola';
  const expiryText = new Date(expiresAt).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short'
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject: `Invitación para unirte a ${familyName} en FamiSalud`,
    text: `${greeting},\n\n${inviterName} te invitó a unirte a la familia "${familyName}" en FamiSalud.\n\nAcepta o rechaza la invitación usando el siguiente enlace: ${inviteUrl}\n\nLa invitación vence el ${expiryText}. Si no esperabas esta invitación, puedes ignorar este mensaje.`,
    html: `<p>${escapeHtml(greeting)},</p><p><strong>${escapeHtml(inviterName)}</strong> te invitó a unirte a la familia <strong>${escapeHtml(familyName)}</strong> en FamiSalud.</p><p><a href="${escapeHtml(inviteUrl)}">Consultar invitación</a></p><p>La invitación vence el ${escapeHtml(expiryText)}.</p><p>Si no esperabas esta invitación, puedes ignorar este mensaje.</p>`
  });
}

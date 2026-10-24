import nodemailer from 'nodemailer';
import { env } from './env.js';
import { AppError } from '../shared/utils/AppError.js';

function isConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
}

function createTransporter() {
  if (!isConfigured()) {
    throw new AppError('El servicio de correo no está configurado.', 503);
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function emailShell({ preheader, eyebrow, title, body, action, footnote }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f7f9;font-family:Arial,Helvetica,sans-serif;color:#172033;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f2f7f9;border-collapse:collapse;">
    <tr><td align="center" style="padding:28px 12px 36px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border-spacing:0;">
        <tr><td style="padding:22px 28px;background:#2596a6;border-radius:18px 18px 0 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td valign="middle" style="font-size:22px;line-height:28px;font-weight:800;letter-spacing:-.5px;color:#ffffff;">FamiSalud</td>
            <td align="right" valign="middle" style="font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#d7fbff;">CUIDADO EN FAMILIA</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:0 28px;background:#7654b8;height:4px;font-size:0;line-height:4px;">&nbsp;</td></tr>
        <tr><td style="padding:34px 30px 30px;background:#ffffff;border:1px solid #e2eaf0;border-top:0;border-radius:0 0 18px 18px;">
          <p style="margin:0 0 10px;font-size:10px;line-height:16px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;color:#2596a6;">${escapeHtml(eyebrow)}</p>
          <h1 style="margin:0 0 18px;font-size:26px;line-height:33px;font-weight:800;letter-spacing:-.7px;color:#152338;">${escapeHtml(title)}</h1>
          ${body}
          ${action || ''}
          ${footnote ? `<div style="margin-top:26px;padding-top:18px;border-top:1px solid #e9eef3;font-size:12px;line-height:19px;color:#64748b;">${footnote}</div>` : ''}
        </td></tr>
        <tr><td align="center" style="padding:20px 18px 0;font-size:11px;line-height:18px;color:#8090a1;">Este es un mensaje automático de FamiSalud.<br>Organiza la información de salud y acompaña el cuidado de tu familia.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail({ to, firstName, code }) {
  const transporter = createTransporter();
  const greeting = firstName ? `Hola ${firstName}` : 'Hola';
  const safeCode = escapeHtml(code);
  const html = emailShell({
    preheader: 'Tu código de recuperación vence en 10 minutos.',
    eyebrow: 'Seguridad de tu cuenta',
    title: 'Recupera tu contraseña',
    body: `<p style="margin:0 0 18px;font-size:15px;line-height:24px;color:#425166;">${escapeHtml(greeting)}. Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa este código para continuar:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 20px;border-collapse:separate;"><tr><td align="center" style="padding:22px 14px;background:#eaf8fa;border:1px solid #cdeef1;border-radius:14px;">
        <p style="margin:0 0 8px;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:#247b86;">Tu código de verificación</p>
        <p style="margin:0;font-size:31px;line-height:40px;font-weight:800;letter-spacing:8px;color:#155e68;">${safeCode}</p>
      </td></tr></table>
      <p style="margin:0;font-size:13px;line-height:21px;color:#425166;">El código vence en <strong>10 minutos</strong> y solo puede utilizarse una vez.</p>`,
    footnote: 'Si no solicitaste recuperar tu contraseña, no compartas este código y puedes ignorar este correo. Tu contraseña actual no cambiará.'
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject: 'Tu código para recuperar la contraseña | FamiSalud',
    text: `${greeting},\n\nRecibimos una solicitud para restablecer la contraseña de tu cuenta FamiSalud.\n\nTu código de verificación es: ${code}\n\nEl código vence en 10 minutos y solo puede utilizarse una vez. Si no solicitaste recuperar tu contraseña, ignora este correo.`,
    html
  });
}

export function hasSmtpConfiguration() {
  return isConfigured();
}

export async function sendFamilyInvitationEmail({ to, inviteeName, inviterName, familyName, inviteUrl, expiresAt }) {
  const transporter = createTransporter();
  const greeting = inviteeName ? `Hola ${inviteeName}` : 'Hola';
  const expiryText = new Date(expiresAt).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short'
  });
  const safeInviteUrl = escapeHtml(inviteUrl);
  const safeFamilyName = escapeHtml(familyName);
  const html = emailShell({
    preheader: `${inviterName} te invitó a unirte a ${familyName} en FamiSalud.`,
    eyebrow: 'Invitación familiar',
    title: 'Te invitaron a compartir el cuidado',
    body: `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#425166;">${escapeHtml(greeting)}. <strong style="color:#152338;">${escapeHtml(inviterName)}</strong> te invitó a formar parte de la familia:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;border-collapse:separate;"><tr><td style="padding:18px 20px;background:#f5f2fc;border:1px solid #e8defb;border-radius:14px;">
        <p style="margin:0 0 5px;font-size:10px;line-height:15px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:#7654b8;">Familia</p>
        <p style="margin:0;font-size:20px;line-height:27px;font-weight:800;color:#33234f;">${safeFamilyName}</p>
        <p style="margin:8px 0 0;font-size:12px;line-height:18px;color:#6e5a8e;">Podrás compartir y consultar información de salud según los permisos de la familia.</p>
      </td></tr></table>
      <p style="margin:0;font-size:13px;line-height:21px;color:#425166;">Revisa la invitación y decide si deseas aceptarla. El enlace vence el <strong>${escapeHtml(expiryText)}</strong>.</p>`,
    action: `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;"><tr><td align="center" bgcolor="#2596a6" style="border-radius:11px;">
      <a href="${safeInviteUrl}" style="display:inline-block;padding:14px 24px;border:1px solid #2596a6;border-radius:11px;font-size:14px;line-height:20px;font-weight:800;color:#ffffff;text-decoration:none;">Consultar invitación</a>
    </td></tr></table>
    <p style="margin:12px 0 0;font-size:11px;line-height:18px;color:#64748b;">Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${safeInviteUrl}" style="color:#247b86;word-break:break-all;">${safeInviteUrl}</a></p>`,
    footnote: 'Si no esperabas esta invitación, puedes ignorar este mensaje. No se añadirá a ninguna familia hasta que respondas a la invitación.'
  });

  await transporter.sendMail({
    from: env.SMTP_FROM || env.SMTP_USER,
    to,
    subject: `Te invitaron a ${familyName} | FamiSalud`,
    text: `${greeting},\n\n${inviterName} te invitó a unirte a la familia "${familyName}" en FamiSalud.\n\nConsulta la invitación: ${inviteUrl}\n\nLa invitación vence el ${expiryText}. Si no esperabas esta invitación, puedes ignorar este mensaje.`,
    html
  });
}

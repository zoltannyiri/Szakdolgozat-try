import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function ensureTransporter() {
  if (transporter) return transporter;

  const host     = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port     = Number(process.env.SMTP_PORT || 465);
  const secure   =
    String(process.env.SMTP_SECURE ?? (port === 465)).toLowerCase() === 'true' || port === 465;
  const user     = process.env.SMTP_USER || '';
  const pass     = process.env.SMTP_PASS || '';
  const fromName = process.env.MAIL_FROM_NAME || 'LoopHub';
  const from     = process.env.SMTP_USER_FROM || user;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,                 // 465: true, 587: false
    auth: { user, pass },
    logger: true,
    debug: true,
    tls: { minVersion: 'TLSv1.2' },
  });

  console.log('[mailer] Using', { host, port, secure, user, from });

  // ellenőrzés
  transporter.verify()
    .then(() => console.log('[mailer] SMTP ready'))
    .catch(err => console.error('[mailer] SMTP error:', err));

  return transporter;
}

export async function sendVerificationEmail({
  to, link, username,
}: { to: string; link: string; username: string }) {
  const t = ensureTransporter();

  const fromName = process.env.MAIL_FROM_NAME || 'LoopHub';
  const from     = process.env.SMTP_USER_FROM || process.env.SMTP_USER || '';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2>Üdv, ${username}!</h2>
      <p>Kattints az alábbi gombra a profilod megerősítéséhez:</p>
      <p><a href="${link}" style="background:#4f46e5;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Profil megerősítése</a></p>
      <p>Ha a gomb nem működik: <a href="${link}">${link}</a></p>
      <p style="color:#64748b;font-size:12px">A link 24 óráig érvényes.</p>
    </div>
  `;

  await t.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: 'Profil megerősítése',
    html,
  });
}

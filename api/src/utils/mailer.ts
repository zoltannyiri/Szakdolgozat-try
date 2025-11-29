import nodemailer from 'nodemailer';

import SMTPTransport from 'nodemailer/lib/smtp-transport';

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

  // transporter = nodemailer.createTransport({
  //   host,
  //   port,
  //   secure,
  //   auth: { user, pass },
  //   logger: true,
  //   debug: true,
  //   tls: { minVersion: 'TLSv1.2' },
  // });
  transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,              // VÁLTÁS: 465 helyett 587 (sokkal stabilabb felhőben)
  secure: false,          // FONTOS: 587-es portnál ez kötelezően FALSE!
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Ez megengedi a kapcsolatot akkor is, ha a Render tanúsítványa nem tetszik a Google-nek
    minVersion: "TLSv1.2"
  },
  family: 4,              // IPv4 kényszerítése (hogy ne akadjon el a DNS)
  logger: true,           // Logolás bekapcsolva
  debug: true,            // Debug infók
  connectionTimeout: 10000, // 10 másodperc után dobjon hibát, ne fagyjon le örökre
  greetingTimeout: 5000     // Ha a szerver nem köszön vissza 5 mp alatt, bontsa
} as SMTPTransport.Options);

  console.log('[mailer] Using', { host, port, secure, user, from });

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
  <div style="background:#0f172a;margin:0;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:0 24px;">
      <!-- Card -->
      <div style="background:#020617;border-radius:18px;border:1px solid #1e293b;box-shadow:0 18px 45px rgba(15,23,42,.8);overflow:hidden;">
        
        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid #1e293b;
                    background:linear-gradient(135deg,#0f172a,#1e293b);">
          <div style="display:flex;align-items:center;">
            <div style="width:36px;height:36px;border-radius:12px;
                        background:linear-gradient(135deg,#f97316,#fb923c);
                        display:flex;align-items:center;justify-content:center;
                        color:#0f172a;font-weight:700;font-size:18px;margin-right:12px;">
              L
            </div>
            <div>
              <div style="font-size:18px;font-weight:600;color:#e5e7eb;">LoopHub</div>
              <div style="font-size:12px;color:#9ca3af;">Fiók megerősítés</div>
            </div>
          </div>
        </div>

        <!-- Body -->
        <div style="padding:24px 24px 20px;color:#e5e7eb;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#f9fafb;">
            Üdv, ${username}!
          </h2>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#cbd5f5;">
            Köszönjük, hogy regisztráltál a <strong>LoopHub</strong> oldalára.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#cbd5f5;">
            A fiókod aktiválásához kérjük, erősítsd meg az e-mail címed az alábbi gombbal:
          </p>

          <!-- Button -->
          <div style="text-align:center;margin:24px 0 20px;">
            <a href="${link}"
               style="display:inline-block;padding:12px 24px;border-radius:999px;
                      background:linear-gradient(135deg,#f97316,#facc15);
                      color:#111827;font-size:14px;font-weight:600;
                      text-decoration:none;box-shadow:0 12px 30px rgba(248,181,23,.45);">
              Profil megerősítése
            </a>
          </div>

          <!-- Fallback link -->
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#9ca3af;">
            Ha a gomb nem működik, másold be az alábbi linket a böngésződ címsorába:
          </p>
          <p style="margin:0 0 8px;font-size:12px;line-height:1.6;word-break:break-all;">
            <a href="${link}" style="color:#fbbf24;text-decoration:underline;">${link}</a>
          </p>

          <p style="margin:16px 0 0;font-size:11px;line-height:1.6;color:#6b7280;">
            A megerősítő link <strong>24 óráig</strong> érvényes. Ha nem te hoztál létre fiókot
            a LoopHubon, kérjük, hagyd figyelmen kívül ezt az e-mailt.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:14px 24px 18px;border-top:1px solid #1e293b;
                    background:#020617;">
          <p style="margin:0;font-size:11px;color:#6b7280;line-height:1.6;">
            Üdvözlettel,<br>
            <span style="color:#e5e7eb;">LoopHub csapat</span>
          </p>
        </div>
      </div>

      <!-- small footer -->
      <p style="margin:16px 0 0;font-size:10px;color:#6b7280;text-align:center;">
        Ezt az üzenetet azért kaptad, mert regisztráltál a LoopHub szolgáltatásba.
      </p>
    </div>
  </div>
  `;

  await t.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: 'Profil megerősítése',
    html,
  });
}

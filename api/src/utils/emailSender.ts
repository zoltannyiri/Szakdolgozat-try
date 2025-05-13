import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import handlebars from 'handlebars';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendVerificationEmail = async (email: string, token: string) => {
  try {
    let html = `
      <h2>Kérjük erősítse meg email címét</h2>
      <p>Kattintson a linkre: ${process.env.FRONTEND_URL}/verify-email?token=${token}</p>
    `;

    // Próbáljuk meg betölteni a template fájlt, ha létezik
    try {
      const templatePath = path.join(__dirname, '../templates/verificationEmail.hbs');
      if (fs.existsSync(templatePath)) {
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        html = template({
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${token}`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@loopshare.com'
        });
      }
    } catch (templateError) {
      console.error("Template betöltési hiba, alap HTML-t használunk:", templateError);
    }

    await transporter.sendMail({
      from: `"LoopShare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Kérjük erősítse meg email címét',
      html
    });
  } catch (error) {
    console.error("Email küldési hiba:", error);
    throw error; // Dobd tovább a hibát, de a regisztráció ettől függetlenül megtörténik
  }
};
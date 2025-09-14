import crypto from 'crypto';
import User from '../models/user.model';
import { sendVerificationEmail } from './mailer';

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function issueVerification(user: { _id: any; email: string; username: string; }) {
  const raw = crypto.randomBytes(32).toString('hex');     // nyers token a linkben
  const tokenHash = sha256(raw);                          // hash megy DB-be
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await User.updateOne(
    { _id: user._id },
    { $set: { verificationToken: tokenHash, verificationTokenExpires: expires, isVerified: false } }
  );

  const appUrl = process.env.APP_URL || 'http://localhost:4200'; // FRONT URL
  const link = `${appUrl}/verify?uid=${user._id}&token=${raw}`;

  await sendVerificationEmail({ to: user.email, link, username: user.username });
}

export async function consumeVerification(uid: string, rawToken: string) {
  const user = await User.findById(uid).select('verificationToken verificationTokenExpires isVerified');
  if (!user) throw new Error('USER_NOT_FOUND');

  if (!user.verificationToken || !user.verificationTokenExpires) throw new Error('NO_TOKEN');
  if (user.verificationTokenExpires.getTime() < Date.now()) throw new Error('TOKEN_EXPIRED');

  const ok = user.verificationToken === sha256(rawToken);
  if (!ok) throw new Error('TOKEN_INVALID');

  user.isVerified = true;
  user.verificationToken = undefined as any;
  user.verificationTokenExpires = undefined as any;
  await user.save();
}

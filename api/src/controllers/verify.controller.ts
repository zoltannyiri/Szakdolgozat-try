import { Request, Response } from 'express';
import User from '../models/user.model';
import { consumeVerification, issueVerification } from '../utils/verify';
import { getCreditConfig } from '../utils/creditConfig';

export async function verifyAccount(req: Request, res: Response) {
  try {
    const { uid, token } = req.body;
    if (!uid || !token) {
      return res.status(400).json({ success: false, message: 'Missing uid or token' });
    }

    // verifikált volt eddig?
    const before = await User.findById(uid).select('isVerified credits');
    if (!before) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await consumeVerification(uid, token);

    if (!before.isVerified) {
    const cfg = await getCreditConfig();
    await User.findByIdAndUpdate(uid, { $inc: { credits: cfg.bonusOnVerify ?? 0 } });
    }


    return res.json({ success: true, message: 'Verified' });
  } catch (e: any) {
    const code = String(e?.message || '');
    const map: Record<string, number> = {
      USER_NOT_FOUND: 404,
      NO_TOKEN: 400,
      TOKEN_EXPIRED: 410,
      TOKEN_INVALID: 400,
    };
    return res.status(map[code] || 500).json({ success: false, code, message: 'Verification failed' });
  }
}

export async function resendVerification(req: Request, res: Response) {
  try {
    const { email, userId } = req.body;

    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ email });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Already verified' });

    await issueVerification({ _id: user._id, email: user.email, username: user.username });
    return res.json({ success: true, message: 'Verification email sent' });
  } catch (e) {
    console.error('[resendVerification] error:', e);
    return res.status(500).json({ success: false, message: 'Resend failed' });
  }
}

export default { verifyAccount, resendVerification };

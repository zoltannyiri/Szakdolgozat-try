import { Response, NextFunction } from 'express';
import User from '../models/user.model';
import { CustomRequest } from './auth.middleware';

export async function blockIfBanned(req: CustomRequest, res: Response, next: NextFunction) {
  try {
    const uid = req.user?.userId;
    if (!uid) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await User.findById(uid).select('bannedUntil banReason');
    if (!user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    if (user.bannedUntil && user.bannedUntil.getTime() > Date.now()) {
      const forever = user.bannedUntil.getUTCFullYear() >= 9999;
      const readableDate = user.bannedUntil.toISOString().replace('T', ' ').substring(0, 16);
      return res.status(403).json({
        success: false,
        code: 'BANNED',
        message: forever
          ? 'A fiók véglegesen tiltva.'
          // : `A fiók ideiglenesen tiltva eddig: ${user.bannedUntil.toISOString()}`, //${readableDate}
          : `A fiók ideiglenesen tiltva eddig: ${readableDate}`,
        until: user.bannedUntil,
        reason: user.banReason || '',
      });
    }

    next();
  } catch (e) {
    console.error('[blockIfBanned] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model';
import { getCreditConfig } from '../utils/creditConfig';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const router = Router();

// egyedi username generálás
async function uniqueUsername(preferred: string) {
  const base = (preferred || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16) || 'user';

  let candidate = base;
  let i = 0;

  while (await User.exists({ username: candidate })) {
    i += 1;
    candidate = `${base}${i}`;
  }
  return candidate;
}

router.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Hiányzó idToken' });
    }

    // Google ID token ellenőrzése
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { sub: googleId, email, email_verified, name, picture } = payload;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Hiányzó email cím' });
    }

    // Meglévő user keresése googleId vagy email alapján
    let user = await User.findOne({ googleId }) || await User.findOne({ email });

    if (user) {
      if (email_verified && !user.isVerified) {
        const cfg = await getCreditConfig();
        const upd = await User.updateOne(
          { _id: user._id, isVerified: false },
          {
            $set: {
              isVerified: true,
              googleId: user.googleId || googleId,
            },
            $inc: {
              credits: cfg.bonusOnVerify ?? 0,
            },
          }
        );

        if ((upd as any).modifiedCount > 0 || (upd as any).nModified > 0) {
          user.isVerified = true;
          user.credits = (user.credits ?? 0) + (cfg.bonusOnVerify ?? 0);
        }
      }

      // googleId linkelése
      if (!user.googleId) {
        user.googleId = googleId as string;
      }
      if (!user.username) {
        user.username = await uniqueUsername(name || email);
      }
      user.lastLogin = new Date();
      await user.save();
    } else {
      const cfg = await getCreditConfig();
      user = new User({
        email,
        username: await uniqueUsername(name || email),
        provider: 'google',
        googleId,
        isVerified: !!email_verified,
        credits:
          (cfg.initialCreditsForNewUser ?? 0) +
          (email_verified ? (cfg.bonusOnVerify ?? 0) : 0),
        lastLogin: new Date(),
      });
      await user.save();
    }

    // JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        email: user.email,
        lastLogin: user.lastLogin,
        credits: user.credits,
        isVerified: user.isVerified,
      },
    });
  } catch (e) {
    console.error('[googleSignIn] error:', e);
    return res.status(500).json({ success: false, message: 'Google sign-in failed' });
  }
});

export default router;

import { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model';

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

    // google id token ellenőrzése
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

    // meglévő user keresése
    let user = await User.findOne({ googleId }) || await User.findOne({ email });

    if (user) {
      // ha van már user az emaillel
      if (user.provider === 'local' && user.password) {
        return res.status(400).json({
          success: false,
          message: 'Ezzel az e-maillel már van jelszavas fiók. Jelentkezz be jelszóval.',
        });
      }

      // Frissítések google fiókra
      user.provider = 'google' as any;
      user.googleId = user.googleId || googleId;
      if (email_verified && !user.isVerified) user.isVerified = true;
      if (!user.username) user.username = await uniqueUsername(name || email);
      if (!user.profileImage && picture) user.profileImage = picture;
      user.lastLogin = new Date();
      await user.save();
    } else {
      // Új user létrehozása JELSZÓ NÉLKÜL
      user = new User({
        email,
        username: await uniqueUsername(name || email),
        provider: 'google',
        googleId,
        isVerified: !!email_verified,
        profileImage: picture || undefined,
        lastLogin: new Date(),
      });
      await user.save();
    }

    // jwt
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    return res.json({ success: true, token, user: { email: user.email, lastLogin: user.lastLogin } });
  } catch (e) {
    console.error('[googleSignIn] error:', e);
    return res.status(500).json({ success: false, message: 'Google sign-in failed' });
  }
});


// router.post('/auth/google/step-up', async (req: Request, res: Response) => {
//   try {
//     const { idToken } = req.body;
//     if (!idToken) return res.status(400).json({ success: false, message: 'Missing idToken' });

//     const ticket  = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
//     const payload = ticket.getPayload();
//     if (!payload?.email || !payload?.sub) {
//       return res.status(401).json({ success: false, message: 'Invalid token' });
//     }


//     const user = await User.findOne({ email: payload.email, googleId: payload.sub });
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });


//     const actionToken = jwt.sign(
//       { sub: String(user._id), typ: 'step-up' },
//       process.env.JWT_SECRET as string,
//       { expiresIn: '5m' }
//     );

//     return res.json({ success: true, actionToken });
//   } catch (e) {
//     console.error('[googleStepUp] error:', e);
//     return res.status(500).json({ success: false, message: 'Step-up failed' });
//   }
// });

export default router;

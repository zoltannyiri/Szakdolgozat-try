// import { Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
// import User from '../models/user.model';
// import { CustomRequest } from './auth.middleware';

// export async function requirePasswordOrStepUp(req: CustomRequest, res: Response, next: NextFunction) {
//   try {
//     const userId = req.user?.userId;
//     if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

//     const dbUser = await User.findById(userId).select('+password provider');
//     if (!dbUser) return res.status(404).json({ success: false, message: 'User not found' });

//     // 1) ha van currentPassword és van tárolt jelszó → ellenőrzés
//     const currentPassword = req.body?.currentPassword;
//     if (currentPassword && dbUser.password) {
//       const ok = await bcrypt.compare(currentPassword, dbUser.password);
//       if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
//       return next();
//     }

//     // 2) ha nincs jelszó, akkor nézünk X-Action-Token-t (step-up)
//     const actionToken = req.header('x-action-token');
//     if (actionToken) {
//       try {
//         const payload: any = jwt.verify(actionToken, process.env.JWT_SECRET as string);
//         if (payload.typ !== 'step-up' || payload.sub !== String(dbUser._id)) {
//           return res.status(401).json({ success: false, message: 'Invalid step-up token' });
//         }
//         return next();
//       } catch {
//         return res.status(401).json({ success: false, message: 'Invalid or expired step-up token' });
//       }
//     }

//     // 3) egyik sem → kérjünk step-up-ot a fronton
//     return res.status(401).json({
//       success: false,
//       code: 'STEP_UP_REQUIRED',
//       message: 'Re-auth required for this action',
//     });
//   } catch (e) {
//     console.error('[requirePasswordOrStepUp] error:', e);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// }

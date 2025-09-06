import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { CustomRequest } from './auth.middleware';

// export const requireAdmin = async (req: CustomRequest, res: Response, next: NextFunction) => {
//   console.log("[requireAdmin] Middleware elindult");

//   try {
//     const userId = req.user?.userId;
//     console.log("[requireAdmin] Tokenből kapott userId:", userId);
//     console.log("[requireAdmin] Teljes token:", req.user);

//     if (!userId) {
//       console.log("[requireAdmin] Hiba: nincs userId a tokenben");
//       return res.status(401).json({ message: 'Unauthorized: no user ID' });
//     }

//     const user = await User.findById(userId);
//     console.log("[requireAdmin] Adatbázisból lekért user:", user);

//     if (!user) {
//       console.log("[requireAdmin] Hiba: nincs ilyen user az adatbázisban");
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (user.role !== 'admin') {
//       console.log("[requireAdmin] Nem admin user:", user.role);
//       return res.status(403).json({ message: 'Forbidden: admin access only' });
//     }

//     console.log("[requireAdmin] ✅ User admin, mehet tovább");
//     next();
//   } catch (err) {
//     console.error('[requireAdmin] Szerverhiba:', err);
//     res.status(500).json({ message: 'Server error in admin check' });
//   }
// };

// admin.middleware.ts
export const requireAdmin = (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    console.log("[requireAdmin] middleware activated. req.user = ", req.user);
    console.log("[requireAdmin] User role:", req.user?.role); // Debug log

    if (!req.user) {
        console.log("[requireAdmin] Error: No user in request");
        return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role !== "admin") {
        console.log("[requireAdmin] Error: User is not admin");
        return res.status(403).json({ message: "Forbidden - not admin" });
    }

    console.log("[requireAdmin] User is admin, proceeding...");
    next();
};
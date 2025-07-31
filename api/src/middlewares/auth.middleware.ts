import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface CustomRequest extends Request {
  user?: any;
}

interface DecodedToken {
  user: any;
}

// export const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
//   const authHeader = req.headers["authorization"];
//   const token = authHeader && authHeader.split(" ")[1];
//   if (!token) return res.status(401).json({ message: "No token provided, authorization denied" });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
//     req.user = decoded;
//     // console.log("Authenticated user:", decoded.user);
//     next();
//   } catch (error) {
//     return res.status(403).json({ message: "Invalid or expired token" });
//   }
// };
// auth.middleware.ts
export const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        
        // Ellenőrizd, hogy a decoded objektum tartalmazza-e a role-t
        console.log("[auth.middleware] Decoded token:", decoded);
        
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role // Győződj meg róla, hogy ez szerepel a tokenben
        };

        console.log("[auth.middleware] User set in request:", req.user);
        next();
    } catch (error) {
        console.error("[auth.middleware] Token invalid:", error);
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};






// commented at 03.11 19:00
// import { Request, Response, NextFunction } from "express";

// interface CustomRequest extends Request {
//     user?: any;
// }
// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// export const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
//     const token = req.header("Authorization")?.split(" ")[1];

//     if (!token) {
//         return res.status(401).json({ message: "Hozzáférés megtagadva! Token szükséges." });
//     }

//     try {
//         const decoded = jwt.verify(token, JWT_SECRET);
//         req.user = decoded;
//         next();
//     } catch (err) {
//         res.status(403).json({ message: "Érvénytelen token!" });
//     }
// };

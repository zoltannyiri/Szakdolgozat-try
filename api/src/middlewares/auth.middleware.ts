import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from '../models/user.model';

export interface CustomRequest extends Request {
  user?: any;
}

interface DecodedToken {
  user: any;
}

export const authenticateToken = async (req: CustomRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided, authorization denied" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;
        const freshUser = await User.findById(decoded.userId).select('role email'); 
        
        if (!freshUser) {
             return res.status(401).json({ message: "User no longer exists" });
        }
        req.user = {
            userId: decoded.userId,
            email: freshUser.email,
            role: freshUser.role 
        };
        next();
    } catch (error) {
        console.error("[auth.middleware] Token invalid:", error);
        return res.status(403).json({ message: "Invalid or expired token" });
    }
};


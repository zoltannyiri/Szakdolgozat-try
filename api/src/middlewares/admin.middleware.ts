import { Request, Response, NextFunction } from 'express';
import User from '../models/user.model';
import { CustomRequest } from './auth.middleware';

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
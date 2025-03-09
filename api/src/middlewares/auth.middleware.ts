import { Request, Response, NextFunction } from "express";

interface CustomRequest extends Request {
    user?: any;
}
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

export const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Hozzáférés megtagadva! Token szükséges." });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: "Érvénytelen token!" });
    }
};

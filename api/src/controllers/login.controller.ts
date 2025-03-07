import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model";
import dotenv from "dotenv";

dotenv.config();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// Bejelentkezés végpont
router.post("/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await UserModel.findOne({ username, password });

        if (!user) {
            return res.status(401).json({ message: "Hibás bejelentkezési adatok!" });
        }

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
        return res.json({ token });
    } catch (error) {
        return res.status(500).json({ message: "Szerverhiba!" });
    }
});

export default router;

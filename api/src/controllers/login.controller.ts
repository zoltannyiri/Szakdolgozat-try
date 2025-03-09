import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import UserModel from "../models/user.model";
import dotenv from "dotenv";
import { validateLogin } from "../middlewares/validation.middleware";

dotenv.config();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// Bejelentkezés végpont
router.post("/login", validateLogin, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    try {
        const user = await UserModel.findOne({ username });

        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ message: "Hibás bejelentkezési adatok!" });
        }

        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
        return res.json({ token });
    } catch (error) {
        return res.status(500).json({ message: "Szerverhiba!" });
    }
});

export default router;

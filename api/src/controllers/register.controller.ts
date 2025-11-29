import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import crypto from 'crypto';
import { validateUser } from "../middlewares/validation.middleware";
import { issueVerification } from "../utils/verify";
import { getCreditConfig } from "../utils/creditConfig";

const router = Router();


router.post("/register", validateUser, async (req: Request, res: Response) => {
    try {
        const { username, email, password, country } = req.body;
        
        // létezik-e már a felhasználó
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "Már létezik ilyen felhasználónév vagy email cím" 
            });
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ 
                success: false,
                message: "Már létezik ilyen email cím" 
            });
        }

        // Jelszó hashelése
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Verifikációs token generálása
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = new Date();
        verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

        
        const cfg = await getCreditConfig();

        // Új felhasználó létrehozása
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: "user",
            date: new Date(),
            country,
            isVerified: false,
            credits: cfg.initialCreditsForNewUser ?? 0
        });

        await newUser.save();

        // Email küldése
       try {
      await issueVerification({
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
      });
    } catch (emailErr) {
      
      console.error("[register] Verification email error:", emailErr);

    }

    return res.status(201).json({
      success: true,
      message: "Sikeres regisztráció",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Szerverhiba a regisztráció során",
    });
  }
});

export default router;
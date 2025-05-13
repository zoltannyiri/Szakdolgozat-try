import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model";
import { sendVerificationEmail } from "../utils/emailSender";
import crypto from 'crypto';
import { validateUser } from "../middlewares/validation.middleware"; // Importáljuk a validátort

const router = Router();

// A validateUser middleware hozzáadása a regisztrációs útvonalhoz
router.post("/register", validateUser, async (req: Request, res: Response) => {
    try {
        const { username, email, password, country } = req.body;
        
        // Ellenőrizzük, hogy létezik-e már a felhasználó
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "Username or email already exists" 
            });
        }

        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ 
                success: false,
                message: "Email already exists" 
            });
        }

        // Jelszó hashelése
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Verifikációs token generálása
        const verificationToken = crypto.randomBytes(20).toString('hex');
        const verificationTokenExpires = new Date();
        verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24);

        // Új felhasználó létrehozása
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: "user",
            date: new Date(),
            country,
            verificationToken,
            verificationTokenExpires,
            isVerified: false
        });

        await newUser.save();

        // Email küldése (hiba esetén is mentjük a felhasználót)
        try {
            await sendVerificationEmail(email, verificationToken);
        } catch (emailError) {
            console.error("Email küldési hiba:", emailError);
        }

        res.status(201).json({ 
            success: true,
            message: "Registration successful",
            userId: newUser._id
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ 
            success: false,
            message: "Server error during registration" 
        });
    }
});

export default router;


// commented at 04. 27
// import { Router, Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import User from "../models/user.model";

// const router = Router();

// router.post("/register", async (req, res) => {
//     try{
//         const { username, email, password, country } = req.body;
//         const existingUser = await User.findOne({ username });
//         if (existingUser) {
//             return res.status(400).json({ message: "Username already exists" });
//         }
//         const hashedPassword = await bcrypt.hash(password, 10);
//         console.log(country);
//         const newUser = new User({
//             username,
//             email,
//             password: hashedPassword,
//             role: "user",
//             date: new Date(),
//             country,
//         });

//         await newUser.save();
//         res.status(201).json({ message: "Registration successful" });
//     }
//     catch (error) {
//         console.error("Registration error:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });

// export default router;

// commented at 03.11 19:00
// // register.controller.ts
// import { Request, Response } from 'express';
// import UserModel from '../models/user.model';
// import bcrypt from 'bcryptjs';

// export const register = async (req: Request, res: Response) => {
//   try {
//     const { username, password } = req.body;

//     // Ellenőrizzük, hogy létezik-e már a felhasználó
//     const existingUser = await UserModel.findOne({ username });
//     if (existingUser) {
//       return res.status(400).json({ 
//         message: 'A felhasználónév már foglalt!' 
//       });
//     }

//     // Jelszó hashelése
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Felhasználó létrehozása
//     const newUser = new UserModel({
//       username,
//       password: hashedPassword
//     });

//     await newUser.save();

//     res.status(200).json({ 
//       message: 'Sikeres regisztráció' 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       message: 'Hiba történt a regisztráció során' 
//     });
//   }
// };
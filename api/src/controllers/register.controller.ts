import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

const router = Router();

router.post("/register", async (req, res) => {
    try{
        const { username, email, password, country } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(country);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            role: "user",
            date: new Date(),
            country,
        });

        await newUser.save();
        res.status(201).json({ message: "Registration successful" });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;

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
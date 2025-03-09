// register.controller.ts
import { Request, Response } from 'express';
import UserModel from '../models/user.model';
import bcrypt from 'bcryptjs';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Ellenőrizzük, hogy létezik-e már a felhasználó
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'A felhasználónév már foglalt!' 
      });
    }

    // Jelszó hashelése
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Felhasználó létrehozása
    const newUser = new UserModel({
      username,
      password: hashedPassword
    });

    await newUser.save();

    res.status(200).json({ 
      message: 'Sikeres regisztráció' 
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Hiba történt a regisztráció során' 
    });
  }
};
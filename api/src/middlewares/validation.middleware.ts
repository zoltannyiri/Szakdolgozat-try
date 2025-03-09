import { Request, Response, NextFunction } from "express";

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Felhasználónév és jelszó szükséges!" });
    }

    next();
};

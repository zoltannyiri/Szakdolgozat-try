import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model";

const router = Router();


router.post("/login", async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: "Invalid login credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid login credentials" });
        }

        await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET as string,
            { expiresIn: "1h" }
        );

        const updatedUser = await User.findById(user._id);

        res.json({ token, user: { email: user.email, lastLogin: updatedUser?.lastLogin } });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;




//commented at 03.11 19:00
// import { Router, Request, Response } from "express";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";
// import UserModel from "../models/user.model";
// import dotenv from "dotenv";
// import { validateLogin } from "../middlewares/validation.middleware";

// dotenv.config();
// const router = Router();
// const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key";

// // Bejelentkezés végpont
// router.post("/login", validateLogin, async (req: Request, res: Response) => {
//     const { username, password } = req.body;

//     try {
//         const user = await UserModel.findOne({ username });

//         if (!user || !bcrypt.compareSync(password, user.password)) {
//             return res.status(401).json({ message: "Hibás bejelentkezési adatok!" });
//         }

//         const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
//         return res.json({ token });
//     } catch (error) {
//         return res.status(500).json({ message: "Szerverhiba!" });
//     }
// });

// export default router;

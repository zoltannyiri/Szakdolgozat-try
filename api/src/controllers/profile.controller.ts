import { Request, Response } from "express";

interface CustomRequest extends Request {
    user: any;
    userId: string;
}
import User from "../models/user.model";

export const getProfile = async (req: CustomRequest, res: Response) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.json({ user });
    } catch (error) {
        console.log("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
};

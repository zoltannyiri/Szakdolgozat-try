import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/user.model";
// import { sendVerificationEmail } from "../utils/emailSender";
import { CustomRequest } from "../middlewares/auth.middleware";
import { issueVerification } from "../utils/verify"; 

export const getProfile: RequestHandler = async (req, res) => {
  try {
    const { user } = req as CustomRequest;
    const userId = user!.userId;

    const dbUser = await User.findById(userId).select("-password");
    if (!dbUser) return res.status(404).json({ message: "User not found" });

    return res.json({ user: dbUser });
  } catch (error) {
    console.log("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProfileByUsername: RequestHandler = async (req, res) => {
  try {
    const { username } = req.params;
    const dbUser = await User
      .findOne({ username })
      .select("-password -verificationToken -verificationTokenExpires");
    if (!dbUser) return res.status(404).json({ message: "User not found" });
    return res.json({ user: dbUser });
  } catch (error) {
    console.log("Error fetching profile by username:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateGeneral: RequestHandler = async (req, res) => {
  try {
    const { user } = req as CustomRequest;
    const userId = user!.userId;
    const { firstName, lastName, country, city, aboutMe } = req.body;

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { firstName, lastName, country, city, aboutMe } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });
    return res.json({ success: true, user: updated });
  } catch (error) {
    console.error("Update general error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changeEmail: RequestHandler = async (req, res) => {
  try {
    const { user } = req as CustomRequest;
    const userId = user!.userId;
    const { newEmail, password } = req.body;

    const dbUser = await User.findById(userId);
    if (!dbUser) return res.status(404).json({ success: false, message: "User not found" });

    // ha gmail belépés, nincs jelszócsere
    if (!dbUser.password) {
      return res.status(400).json({
        success: false,
        message: 'Ez a fiók Google bejelentkezést használ, jelszó-ellenőrzés nélkül nem módosítható az e-mail.'
      });
    }

    const passOk = await bcrypt.compare(password, dbUser.password);
    if (!passOk) return res.status(400).json({ success: false, message: "Invalid password" });

    const exists = await User.findOne({ email: newEmail });
    if (exists) return res.status(400).json({ success: false, message: "Email already in use" });

    // email megváltoztatása
    dbUser.email = newEmail;
    dbUser.isVerified = false;

    dbUser.verificationToken = crypto.randomBytes(20).toString("hex");
    dbUser.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await dbUser.save();

    await issueVerification({
      _id: dbUser._id,
      email: dbUser.email,
      username: dbUser.username,
    });

    // try { await sendVerificationEmail(newEmail, dbUser.verificationToken!); } catch {}

    return res.json({ success: true, message: "Email updated. Please verify your new email." });
  } catch (error) {
    console.error("Change email error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changePassword: RequestHandler = async (req, res) => {
  try {
    const { user } = req as CustomRequest;
    const userId = user!.userId;
    const { currentPassword, newPassword } = req.body;

    const dbUser = await User.findById(userId);
    if (!dbUser) return res.status(404).json({ success: false, message: "User not found" });

    // ha gmail belépés, nincs jelszó
    if (!dbUser.password) {
      return res.status(400).json({
        success: false,
        message: 'Ez a fiók Google bejelentkezést használ, nincs beállított jelszó.'
      });
    }

    const match = await bcrypt.compare(currentPassword, dbUser.password);
    if (!match) return res.status(400).json({ success: false, message: "Current password is incorrect" });

    dbUser.password = await bcrypt.hash(newPassword, 10);
    await dbUser.save();

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const changeUsername: RequestHandler = async (req, res) => {
  try {
    const { user } = req as CustomRequest;
    const userId = user?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const raw = String(req.body?.newUsername || "").trim();
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    if (!raw) return res.status(400).json({ message: "Adj meg egy új nicknevet" });
    if (!re.test(raw)) {
      return res.status(400).json({ message: "3–20 karakter, csak betű/szám/_ engedélyezett" });
    }

    
    const me = await User.findById(userId).select("_id username");
    if (!me) return res.status(404).json({ message: "User not found" });
    if (me.username.toLowerCase() === raw.toLowerCase()) {
      return res.status(200).json({ user: { username: me.username } });
    }

    // létezik e ilyen nicknév
    const exists = await User.findOne({ username: { $regex: `^${raw}$`, $options: "i" } }).select("_id");
    if (exists) return res.status(409).json({ message: "Ez a nick már foglalt" });

    me.username = raw;
    await me.save();

    return res.status(200).json({ user: { username: me.username } });
  } catch (err) {
    console.error("changeUsername error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
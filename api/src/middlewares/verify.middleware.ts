//új
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import { CustomRequest } from "./auth.middleware";

export const checkVerified = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.userId) {
      console.error('[checkVerified] No user in request');
      return res.status(401).json({ 
        success: false,
        message: "Authentication required" 
      });
    }
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }
    console.log(`[checkVerified] User ID: ${req.user.userId}, Fetched User Data:`, JSON.stringify(user, null, 2));
    console.log(`[checkVerified] User isVerified status from DB: ${user.isVerified}`);
    console.log(`[checkVerified] Checking verification for user: ${req.user.userId}`);

    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false,
        message: "Email verification required",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    next();
  } catch (error) {
    console.error("Verification check error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error during verification check" 
    });
  }
};

// export const requireAdmin = async (req: CustomRequest, res: Response, next: NextFunction) => {
//   try {
//     if (!req.user || !req.user.userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required"
//       });
//     }

//     const user = await User.findById(req.user.userId);
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     if (user.role !== "admin") {
//       return res.status(403).json({
//         success: false,
//         message: "Admin privileges required"
//       });
//     }

//     next();
//   } catch (error) {
//     console.error("Admin check error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Server error during admin check"
//     });
//   }
// };
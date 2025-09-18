import { Router } from "express";
import { getProfile, getProfileByUsername, updateGeneral, changeEmail, changePassword, changeUsername } from "../controllers/profile.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateGeneralProfile, validateEmailChange, validatePasswordChange } from "../middlewares/validation.middleware";
// import { requirePasswordOrStepUp } from "../middlewares/stepup.middleware";


const router = Router();

// Saját profil (JWT kötelező)
router.get("/", authenticateToken, getProfile);

// Nyilvános profil felhasználónév alapján
router.get("/:username([A-Za-z0-9_]{3,20})", getProfileByUsername);

// Általános adatok frissítése (firstName, lastName, country, city, aboutMe)
router.put("/", authenticateToken, validateGeneralProfile, updateGeneral);

// E-mail csere
router.patch("/email", authenticateToken, validateEmailChange, changeEmail);

// Jelszó csere
router.patch("/password", authenticateToken, validatePasswordChange, changePassword);

// Username váltás
router.patch("/username", authenticateToken, changeUsername);

// router.put('/profile/email', authenticateToken, requirePasswordOrStepUp, changeEmail);
// router.put('/profile/password', authenticateToken, requirePasswordOrStepUp, changePassword);

export default router;

import { Router } from "express";
import { getProfile, getProfileByUsername, updateGeneral, changeEmail, changePassword } from "../controllers/profile.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateGeneralProfile, validateEmailChange, validatePasswordChange } from "../middlewares/validation.middleware";


const router = Router();

// Saját profil (JWT kötelező)
router.get("/", authenticateToken, getProfile);

// Nyilvános profil felhasználónév alapján (nálad eddig is publikus volt)
router.get("/:username([A-Za-z0-9_]{3,20})", getProfileByUsername);

// Általános adatok frissítése (firstName, lastName, country, city, aboutMe)
router.put("/", authenticateToken, validateGeneralProfile, updateGeneral);

// E-mail csere (jelszó szükséges, új verifikáció)
router.patch("/email", authenticateToken, validateEmailChange, changeEmail);

// Jelszó csere (current + new)
router.patch("/password", authenticateToken, validatePasswordChange, changePassword);

export default router;

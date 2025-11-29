import { Router } from "express";
import { getProfile, getProfileByUsername, updateGeneral, changeEmail, changePassword, changeUsername, updateSocials } from "../controllers/profile.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { validateGeneralProfile, validateEmailChange, validatePasswordChange, validateSocials } from "../middlewares/validation.middleware";


const router = Router();

router.get("/", authenticateToken, getProfile);
router.get("/:username([A-Za-z0-9_]{3,20})", getProfileByUsername);
router.put("/", authenticateToken, validateGeneralProfile, updateGeneral);
router.patch("/email", authenticateToken, validateEmailChange, changeEmail);
router.patch("/password", authenticateToken, validatePasswordChange, changePassword);
router.patch("/username", authenticateToken, changeUsername);
router.patch("/socials", authenticateToken, validateSocials, updateSocials);

export default router;

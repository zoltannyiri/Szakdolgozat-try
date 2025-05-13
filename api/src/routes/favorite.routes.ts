import { Router } from "express";
import { 
  addFavorite, 
  removeFavorite, 
  getUserFavorites,
  checkFavoriteStatus
} from "../controllers/favorite.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { checkVerified } from "../middlewares/verify.middleware";

const router = Router();

router.post("/loops/:loopId/favorite", 
  authenticateToken, 
  checkVerified,
  addFavorite);

router.delete("/loops/:loopId/favorite", 
  authenticateToken, 
  checkVerified,
  removeFavorite);

router.get("/favorites", 
  authenticateToken, 
  getUserFavorites);

router.get("/loops/:loopId/favorite-status", 
  authenticateToken, 
  checkFavoriteStatus);

export default router;
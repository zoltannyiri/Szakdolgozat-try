import { Request, Response } from "express";
import Favorite from "../models/favorite.model";
import { CustomRequest } from "../middlewares/auth.middleware";
import Loop from "../models/loop.model";

export const addFavorite = async (req: CustomRequest, res: Response) => {
  try {
    const { loopId } = req.params;
    const userId = req.user.userId;

    const loop = await Loop.findById(loopId);
    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

    const favorite = new Favorite({
      user: userId,
      loop: loopId
    });

    await favorite.save();

    res.status(201).json({
      success: true,
      message: "Loop added to favorites successfully",
      favorite
    });

  } catch (error) {
    if ((error as any).code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: "This loop is already in your favorites" 
      });
    }
    console.error("Favorite error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

export const removeFavorite = async (req: CustomRequest, res: Response) => {
  try {
    const { loopId } = req.params;
    const userId = req.user.userId;

    const result = await Favorite.findOneAndDelete({
      user: userId,
      loop: loopId
    });

    if (!result) {
      return res.status(404).json({ 
        success: false,
        message: "Favorite not found" 
      });
    }

    res.json({
      success: true,
      message: "Removed from favorites successfully"
    });

  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

export const getUserFavorites = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user.userId;

    const favorites = await Favorite.find({ user: userId })
      .populate({
        path: 'loop',
        populate: {
          path: 'uploader',
          select: 'username'
        }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      favorites: favorites.map(f => f.loop)
    });

  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};

export const checkFavoriteStatus = async (req: CustomRequest, res: Response) => {
  try {
    const { loopId } = req.params;
    const userId = req.user.userId;

    const favorite = await Favorite.findOne({
      user: userId,
      loop: loopId
    });

    res.json({
      success: true,
      isFavorite: !!favorite
    });

  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error" 
    });
  }
};



// új: teljesítmény miatt
export const getFavoriteIds = async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const ids = await Favorite.find({ user: userId }).distinct("loop");
    res.json({ success: true, ids });
  } catch (error) {
    console.error("Get favorite ids error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
import { Request, Response } from "express";
import Loop from "../models/loop.model";
import { ILoop } from "../models/loop.model";
import { CustomRequest } from "../middlewares/auth.middleware";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { getAudioDurationInSeconds } from "get-audio-duration";
import Notification from "../models/notification.model";
import User from "../models/user.model";

const pump = promisify(pipeline);

export const uploadLoop = async (req: CustomRequest, res: Response) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Metaadatok kiolvasása a JSON-ból
    const metadata = JSON.parse(req.body.metadata);
    const { bpm, key, scale, tags, instrument } = metadata;

    // Validáció
    const requiredFields = ['bpm', 'key', 'scale', 'instrument'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    const uploader = req.user.userId;
    const filePath = req.file.path;
    const filename = req.file.filename;

    // Egyéni név vagy eredeti fájlnév használata
    const customName = req.body.customName || null;
    const displayName = customName 
      ? `${customName}${path.extname(filename)}`
      : filename;
    
    const duration = await getAudioDurationInSeconds(filePath);

    // Új loop létrehozása
    const newLoop = new Loop({
      filename: displayName,
      // path: filePath,
      path: `uploads/${filename}`,
      uploader,
      bpm: parseInt(bpm),
      key,
      scale,
      tags: Array.isArray(tags) ? tags : [],
      instrument,
      duration
    });

    await newLoop.save();
    
    res.status(201).json({
      message: "Loop uploaded successfully",
      loop: {
        id: newLoop._id,
        filename: newLoop.filename, 
        bpm: newLoop.bpm,
        key: newLoop.key,
        scale: newLoop.scale,
        instrument: newLoop.instrument,
        duration: newLoop.duration
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(500).json({ message: "Server error during upload" });
  }
};

export const getLoops = async (req: Request, res: Response) => {
  try {
    const { bpm, minBpm, maxBpm, key, scale, instrument, tags } = req.query;
    
    const filter: any = {};
    // BPM szűrés javítása
    if (bpm) {
      filter.bpm = parseInt(bpm as string);
    }
    // BPM tartomány szűrés
    else if (minBpm || maxBpm) {
      filter.bpm = {};
      if (minBpm) filter.bpm.$gte = parseInt(minBpm as string);
      if (maxBpm) filter.bpm.$lte = parseInt(maxBpm as string);
    }
    if (key) filter.key = key;
    if (scale) filter.scale = scale;
    if (instrument) filter.instrument = instrument;
    if (tags) filter.tags = { $in: (tags as string).split(",") };

    console.log('Filter object:', filter); 

    const loops = await Loop.find(filter)
      .populate("uploader", "username")
      .sort({ uploadDate: -1 });

    res.json(loops);
  } catch (error) {
    console.error("Error fetching loops:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const downloadLoop = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId; // Felhasználó ID lekérése
    const loop = await Loop.findByIdAndUpdate(
      id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

  // Értesítés küldése a feltöltőnek, ha nem ő töltötte le
  if (loop.uploader.toString() !== userId) {
    const notification = new Notification({
      userId: loop.uploader,
      type: 'download',
      message: `${req.user.username} letöltötte a loopodat: ${loop.filename}`,
      relatedItemId: loop._id
    });
    await notification.save();
  }
    

    res.download(loop.path, loop.filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Error downloading file" });
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLoopById = async (req: Request, res: Response) => {
  try {
    const loop = await Loop.findById(req.params.id)
      .populate('uploader', 'username')
      .exec();
    
    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

    res.json(loop);
  } catch (error) {
    console.error("Error fetching loop:", error);
    res.status(500).json({ message: "Server error" });
  }
};


//loop likeolása
export const likeLoop = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const loop = await Loop.findById(id);
    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

    // Ellenőrizzük, hogy a felhasználó már likeolta-e
    if (loop.likedBy.some(likedUserId => likedUserId.equals(userId))) {
      return res.status(400).json({ message: "You already liked this loop" });
    }

    // Like hozzáadása
    loop.likes += 1;
    loop.likedBy.push(userId);
    await loop.save();

    // Értesítés küldése a feltöltőnek, ha nem ő likeolta
    if (!loop.uploader.equals(userId)) {
      const liker = await User.findById(userId);
      
      if (liker) {
        const notification = new Notification({
          userId: loop.uploader,
          user: userId,
          type: 'like',
          message: `${liker.username} likeolta a loopodat: ${loop.filename}`,
          relatedItemId: loop._id
        });
        await notification.save();
      }
    }

    res.json({ success: true, likes: loop.likes });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const unlikeLoop = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const loop = await Loop.findById(id);
    if (!loop) {
      return res.status(404).json({ message: "Loop not found" });
    }

    // Ellenőrizzük, hogy a felhasználó likeolta-e
    const userIndex = loop.likedBy.findIndex(likedUserId => likedUserId.equals(userId));
    if (userIndex === -1) {
      return res.status(400).json({ message: "You haven't liked this loop yet" });
    }

    // Like eltávolítása
    loop.likes -= 1;
    loop.likedBy.splice(userIndex, 1);
    await loop.save();

    res.json({ success: true, likes: loop.likes });
  } catch (error) {
    console.error("Unlike error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
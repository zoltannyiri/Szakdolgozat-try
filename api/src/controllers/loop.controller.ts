import { Request, Response, RequestHandler } from "express";
import Loop from "../models/loop.model";
import { CustomRequest } from "../middlewares/auth.middleware";
import { promisify } from "util";
import { pipeline } from "stream";
import Notification from "../models/notification.model";
import User from "../models/user.model";
import { checkVerified } from "../middlewares/verify.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";
import { getCreditConfig } from "../utils/creditConfig";
import { Types } from 'mongoose';
const pump = promisify(pipeline);
import { uploadBufferToDrive } from "../utils/drive";
import { parseBuffer } from "music-metadata";



export const uploadLoop = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // meta
    const metadata = JSON.parse(req.body.metadata);
    const { bpm, key, scale, tags, instrument, customName: metaCustomName } = metadata;

    const uploader = req.user.userId;
    const original = req.file.originalname;
    const ext = (original.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
    const baseName  = original.replace(/\.[^.]+$/, "");
    const customName = (metaCustomName ?? "").toString().trim();
    const displayName = customName || baseName;


    // hossz bufferből
    let duration = 0;
    try {
      const meta = await parseBuffer(req.file.buffer, { mimeType: req.file.mimetype, size: req.file.size });
      duration = meta.format.duration ?? 0;
    } catch (e) {
      console.warn('duration parse failed:', e);
    }

    // feltöltés Drive-ra
    const up = await uploadBufferToDrive(req.file.buffer, displayName, req.file.mimetype);
    const approvedCount = await Loop.countDocuments({ uploader, status: 'approved' });

    // DB mentés
    const newLoop = new Loop({
      filename: displayName,
      path: `${process.env.API_BASE_URL}/api/files/${up.fileId}`,
      driveFileId: up.fileId,
      webViewLink: up.webViewLink,
      webContentLink: up.webContentLink,
      uploader,
      bpm: parseInt(bpm),
      key,
      scale,
      tags: Array.isArray(tags) ? tags : [],
      instrument,
      duration,
      status: approvedCount < 5 ? 'pending' : 'approved'
    });

    await newLoop.save();

    const cfg = await getCreditConfig();
    if (newLoop.status === 'approved') {
    await User.findByIdAndUpdate(uploader, { $inc: { credits: cfg.creditsPerApprovedUpload ?? 0 } });
    }

    return res.status(201).json({
      message: newLoop.status === 'approved'
        ? "Loop feltöltve és jóváhagyva"
        : "Loop feltöltve, jóváhagyásra vár (az első 5 feltöltés)",
      loop: {
        id: newLoop._id,
        filename: newLoop.filename,
        bpm: newLoop.bpm,
        key: newLoop.key,
        scale: newLoop.scale,
        instrument: newLoop.instrument,
        duration: newLoop.duration,
        status: newLoop.status
      }
    });

  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Server error during upload" });
  }
};

export const downloadLoop = [
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.userId;

      const loop = await Loop.findById(id);
      if (!loop) {
        return res.status(404).json({ success: false, message: "Loop not found" });
      }
      await Loop.findByIdAndUpdate(id, { $inc: { downloads: 1 } });
      const isOwner = currentUserId && loop.uploader.toString() === currentUserId;
      if (!isOwner) {
          const cfg = await getCreditConfig();
          const reward = Math.max(0, cfg.rewardPerDownloadToUploader || 0);
          if (reward > 0 && loop.uploader) {
            await User.findByIdAndUpdate(loop.uploader, { $inc: { credits: reward } }).exec();
          }
      }
      return res.json({ 
          success: true, 
          downloadUrl: loop.path 
      });

    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
];

// Loop lista
export const getLoops = async (req: Request, res: Response) => {
  try {
    const { bpm, minBpm, maxBpm, key, scale, instrument, tags, uploader, sortBy, q } = req.query;

    // lapozás
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '8', 10)));
    const skip = (page - 1) * limit;
    const filter: any = { status: 'approved' };

    //feltöltő
    if (uploader) {
      filter.uploader = uploader; 
    }
    // BPM 
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

    let sort: any;
    switch (sortBy) {
      case 'downloads':
        sort = { downloads: -1, uploadDate: -1 };
        break;
      case 'likes':
        sort = { likes: -1, uploadDate: -1 };
        break;
      case 'recent':
      default:
        sort = { uploadDate: -1 };
        break;
    }
      const [items, total] = await Promise.all([
      Loop.find(filter)
        .populate("uploader", "username")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Loop.countDocuments(filter),
    ]);

    res.json({ success: true, items, total, page, pageSize: limit });
  } catch (error) {
    console.error("Error fetching loops:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getLoopById = async (req: Request, res: Response) => {
  try {
    const loop = await Loop.findById(req.params.id)
      .populate('uploader', 'username')
      .exec();
    
    if (!loop) {
      return res.status(404).json({ message: "A loop nem található" });
    }

    res.json(loop);
  } catch (error) {
    console.error("Error fetching loop:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const likeLoop = [
  authenticateToken,
  checkVerified,
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const loop = await Loop.findById(id);
      if (!loop) {
        return res.status(404).json({ message: "Loop not found" });
      }

      if (loop.likedBy.some(likedUserId => likedUserId.equals(userId))) {
        return res.status(400).json({ message: "Már likeoltad ezt a loopot" });
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
  }
];

export const unlikeLoop = [
  authenticateToken,
  checkVerified,
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const loop = await Loop.findById(id);
      if (!loop) {
        return res.status(404).json({ message: "Loop nem található" });
      }

      // a felhasználó likeolta-e
      const userIndex = loop.likedBy.findIndex(likedUserId => likedUserId.equals(userId));
      if (userIndex === -1) {
        return res.status(400).json({ message: "Még nem likeoltad ezt a loopot" });
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
  }
];

//LOOP MÓDOSÍTÁS
export const updateLoopAdmin = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;

    
    const allowed: Array<'filename'|'bpm'|'key'|'scale'|'instrument'|'tags'> =
      ['filename','bpm','key','scale','instrument','tags'];

      // összehasonlítás
    const original = await Loop.findById(id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Loop nem található' });
    }

    const update: any = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    }

    // bpm
    if (update.bpm !== undefined) {
      const n = Number(update.bpm);
      update.bpm = Number.isFinite(n) ? n : undefined;
    }

    // tags
    if (typeof update.tags === 'string') {
      update.tags = update.tags
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length);
    }


    const changedFields: string[] = [];
    for (const k of allowed) {
      if (update[k] === undefined) continue;

      const before = (original as any)[k];
      const after  = update[k];

      const isEqual = Array.isArray(before) && Array.isArray(after)
        ? (before.length === after.length && before.every((v: any, i: number) => v === after[i]))
        : before === after;

      if (!isEqual) changedFields.push(k);
    }

    const loop = await Loop.findByIdAndUpdate(id, update, { new: true });
    if (!loop) {
      return res.status(404).json({ success: false, message: 'Loop nem található' });
    }

    
    const actorId =
    req.user?.userId && Types.ObjectId.isValid(req.user.userId)
      ? new Types.ObjectId(req.user.userId)
      : undefined;

     if (changedFields.length > 0) {
      try {
        await Notification.create({
          userId: loop.uploader,
          user: actorId || undefined,
          type: 'loop_edited',
          message: `Az admin módosította a(z) “${loop.filename}” loop adatait.`,
          relatedItemId: loop._id
        });
      } catch (err) {
        console.error('[updateLoopAdmin] failed to create loop_edited notification:', err);
      }
    }

    return res.json({ success: true, data: loop });
  } catch (err) {
    console.error('updateLoopAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Szerver hiba' });
  }
};

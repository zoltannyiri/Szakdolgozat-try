import { Request, Response, RequestHandler } from "express";
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
import { checkVerified } from "../middlewares/verify.middleware";
import { authenticateToken } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";
import { validateLoopMetadata } from "../middlewares/validation.middleware";
import { getCreditConfig } from "../utils/creditConfig";
import { Types } from 'mongoose';

const pump = promisify(pipeline);

// export const uploadLoop = 
//   async (req: CustomRequest, res: Response) => {
//     try {
//       console.log('Request body:', req.body);
//       console.log('Request file:', req.file);

//       if (!req.file) {
//         return res.status(400).json({ message: "No file uploaded" });
//       }

//       // Metaadatok kiolvasása a JSON-ból
//       const metadata = JSON.parse(req.body.metadata);
//       const { bpm, key, scale, tags, instrument } = metadata;

//       // Validáció
//       const requiredFields = ['bpm', 'key', 'scale', 'instrument'];
//       for (const field of requiredFields) {
//         if (!metadata[field]) {
//           return res.status(400).json({ message: `Missing required field: ${field}` });
//         }
//       }

//       const uploader = req.user.userId;
//       const filePath = req.file.path;
//       const filename = req.file.filename;

//       // Egyéni név vagy eredeti fájlnév használata
//       const customName = req.body.customName || null;
//       const displayName = customName 
//         ? `${customName}${path.extname(filename)}`
//         : filename;
      
//       const duration = await getAudioDurationInSeconds(filePath);

//       // Új loop létrehozása
//       const newLoop = new Loop({
//         filename: displayName,
//         // path: filePath,
//         path: `uploads/${filename}`,
//         uploader,
//         bpm: parseInt(bpm),
//         key,
//         scale,
//         tags: Array.isArray(tags) ? tags : [],
//         instrument,
//         duration
//       });

//       await newLoop.save();
      
//       res.status(201).json({
//         message: "Loop uploaded successfully",
//         loop: {
//           id: newLoop._id,
//           filename: newLoop.filename, 
//           bpm: newLoop.bpm,
//           key: newLoop.key,
//           scale: newLoop.scale,
//           instrument: newLoop.instrument,
//           duration: newLoop.duration
//         }
//       });

//     } catch (error) {
//       console.error("Upload error:", {
//         error: error instanceof Error ? error.message : error,
//         file: req.file,
//         metadata: req.body.metadata,
//         user: req.user
//       });
//       if (req.file) {
//         fs.unlink(req.file.path, (err) => {
//           if (err) console.error("Error deleting file:", err);
//         });
//       }
//       res.status(500).json({ message: "Server error during upload", 
//         error: error instanceof Error ? error.message : 'Unknown error' });
//     }
//   };

import { uploadBufferToDrive } from "../utils/drive";
import { parseBuffer } from "music-metadata";
import { checkVerifiedOrBanned } from "../middlewares/userAccess.guard";
import { requireDownloadCredit } from "../middlewares/credits.middleware";



export const uploadLoop = async (req: CustomRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // meta
    const metadata = JSON.parse(req.body.metadata);
    const { bpm, key, scale, tags, instrument } = metadata;

    const uploader = req.user.userId;
    const original = req.file.originalname;
    const ext = (original.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
    const customName = req.body.customName?.trim();
    const displayName = customName ? `${customName}${ext}` : original;

    // 1) hossz bufferből
    let duration = 0;
    try {
      const meta = await parseBuffer(req.file.buffer, { mimeType: req.file.mimetype, size: req.file.size });
      duration = meta.format.duration ?? 0;
    } catch (e) {
      // fallback: ha nem sikerül kiolvasni, 0 marad
      console.warn('duration parse failed:', e);
    }

    // 2) feltöltés Drive-ra bufferből
    const up = await uploadBufferToDrive(req.file.buffer, displayName, req.file.mimetype);

    // DB mentés előtt döntés a jóváhagyásról
    const approvedCount = await Loop.countDocuments({ uploader, status: 'approved' });

    // 3) DB mentés
    const newLoop = new Loop({
      filename: displayName,
      // path: up.downloadUrl,        
      // path: `/api/files/${up.fileId}`,
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

    
    // if (newLoop.status === 'approved') {
    //   await User.findByIdAndUpdate(uploader, { $inc: { credits: 2 } });
    // }


    const cfg = await getCreditConfig();
    if (newLoop.status === 'approved') {
    await User.findByIdAndUpdate(uploader, { $inc: { credits: cfg.creditsPerApprovedUpload ?? 0 } });
    }

    return res.status(201).json({
      message: newLoop.status === 'approved'
        ? "Loop uploaded & published"
        : "Loop uploaded, awaiting approval (first 5 uploads)",
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



//módosítva: 2025. 04. 27
// export const downloadLoop = [
//   authenticateToken,
//   checkVerified,
//   async (req: CustomRequest, res: Response) => {
//     try {
//       const { id } = req.params;
//       console.log('Download request for loop ID:', id); // [4]

//       const userId = req.user?.userId;

//       const loop = await Loop.findById(id);
//       if (!loop) {
//         console.log('Loop not found in database'); // [5]
//         return res.status(404).json({ 
//           success: false,
//           message: "Loop not found" 
//         });
//       }

//       // Frissítjük a letöltések számát
//       await Loop.findByIdAndUpdate(id, { $inc: { downloads: 1 } });

//       // Abszolút útvonal létrehozása
//       const absolutePath = path.join(__dirname, '..', loop.path);
      
      
//       console.log('Attempting to send file:', { // [6]
//         dbPath: loop.path,
//         absolutePath: absolutePath,
//         exists: fs.existsSync(absolutePath)
//       });

//       // Ellenőrizzük, hogy a fájl létezik-e
//       if (!fs.existsSync(absolutePath)) {
//         console.error('File not found at path:', absolutePath); // [7]
//         return res.status(404).json({ 
//           success: false,
//           message: "File not found on server" 
//         });
//       }

//       // Beállítjuk a megfelelő header-eket
//       res.setHeader('Content-Disposition', `attachment; filename="${loop.filename}"`);
//       res.setHeader('Content-Type', 'audio/wav');
//       console.log('Headers set, sending file...'); // [8]
      
//       // Fájl küldése
//       res.sendFile(absolutePath, (err) => {
//         if (err) {
//           console.error('File send error:', err); // [9]
//           if (!res.headersSent) {
//             res.status(500).json({ 
//               success: false,
//               message: "Error sending file" 
//             });
//           }
//         }
//         else {
//           console.log('File sent successfully'); // [10]
//         }
//       });
//     } catch (error) {
//       console.error('Download error:', error); // [11]
//       res.status(500).json({ 
//         success: false,
//         message: "Server error" 
//       });
//     }
//   }
// ];


//módosítva: 2025. 04. 27
export const downloadLoop = [
  // authenticateToken,
  // // checkVerified,
  // checkVerifiedOrBanned,
  // requireDownloadCredit,
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const loop = await Loop.findById(id);
      if (!loop) {
        return res.status(404).json({ success: false, message: "Loop not found" });
      }

      // Letöltésszámláló
      await Loop.findByIdAndUpdate(id, { $inc: { downloads: 1 } });

      const cfg = await getCreditConfig();
      const reward = Math.max(0, cfg.rewardPerDownloadToUploader || 0);
      if (reward > 0 && loop.uploader) {
        await User.findByIdAndUpdate(loop.uploader, { $inc: { credits: reward } }).exec();
      }
      
      if (/^https?:\/\//i.test(loop.path)) {
        
        return res.redirect(loop.path);
      }

      // Lokális fájlok keresése
      const absolutePath = path.join(__dirname, '..', loop.path);
      if (!fs.existsSync(absolutePath)) {
        return res.status(404).json({ success: false, message: "File not found on server" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${loop.filename}"`);
      res.setHeader('Content-Type', 'audio/wav');
      return res.sendFile(absolutePath, (err) => {
        if (err && !res.headersSent) {
          res.status(500).json({ success: false, message: "Error sending file" });
        }
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
    
    // const filter: any = {};
    const filter: any = { status: 'approved' };

    //feltöltő
    if (uploader) {
      filter.uploader = uploader; 
    }
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

      const [items, total] = await Promise.all([
      Loop.find(filter)
        .populate("uploader", "username")
        .sort({ uploadDate: -1 })
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
      return res.status(404).json({ message: "Loop not found" });
    }

    res.json(loop);
  } catch (error) {
    console.error("Error fetching loop:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const likeLoop = [
  authenticateToken,
  checkVerified, // Csak megerősített felhasználók likeolhatnak
  async (req: CustomRequest, res: Response) => {
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
  }
];

export const unlikeLoop = [
  authenticateToken,
  checkVerified, // Csak megerősített felhasználók unlikeolhatnak
  async (req: CustomRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const loop = await Loop.findById(id);
      if (!loop) {
        return res.status(404).json({ message: "Loop nem található" });
      }

      // Ellenőrizzük, hogy a felhasználó likeolta-e
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
          message: `Az admin módosította a(z) “${loop.filename}” loop adatait (mezők: ${changedFields.join(', ')}).`,
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


// // új: admin bírálás loopról
// export const listLoopsAdmin: RequestHandler = async (req, res) => {
//   console.log('[listLoopsAdmin] status=', req.query.status);
//   try {
//     const { status } = req.query as { status?: 'pending'|'approved'|'rejected' };
//     const q: any = {};
//     if (status) q.status = status;

//     const loops = await Loop.find(q)
//       .populate('uploader', 'username')
//       .sort({ uploadDate: -1 })
//       .lean();

//     res.json({ success: true, loops });
//     console.log('[listLoopsAdmin] found:', loops.length);
//   } catch (e) {
//     console.error('listLoopsAdmin error:', e);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };


// export const approveLoopAdmin: RequestHandler = async (req: any, res) => {
//   try {
//     const { id } = req.params;
//     const loop = await Loop.findById(id);
//     if (!loop) return res.status(404).json({ success: false, message: 'Loop nem található' });

//     loop.status = 'approved';
//     loop.rejectReason = '';
//     loop.moderatedBy = req.user?.userId || null;
//     loop.moderatedAt = new Date();
//     await loop.save();

//     // kreditek jóváírása a feltöltönek
//     // const CREDIT_PER_APPROVED_UPLOAD = 2;
//     // await User.findByIdAndUpdate(loop.uploader, { $inc: { credits: CREDIT_PER_APPROVED_UPLOAD } });
//     const cfg = await getCreditConfig();
//     await User.findByIdAndUpdate(loop.uploader, {
//       $inc: { credits: cfg.creditsPerApprovedUpload ?? 0 }
//     });

//     return res.json({ success: true });
//   } catch (e) {
//     console.error('approveLoopAdmin error:', e);
//     return res.status(500).json({ success: false, message: 'Szerver hiba' });
//   }
// };

// export const rejectLoopAdmin: RequestHandler = async (req: any, res) => {
//   try {
//     const { id } = req.params;
//     const { reason } = req.body as { reason?: string };
//     const loop = await Loop.findById(id);
//     if (!loop) return res.status(404).json({ success: false, message: 'Loop nem található' });

//     loop.status = 'rejected';
//     loop.rejectReason = (reason || '').trim();
//     loop.moderatedBy = req.user?.userId || null;
//     loop.moderatedAt = new Date();
//     await loop.save();

//     return res.json({ success: true });
//   } catch (e) {
//     console.error('rejectLoopAdmin error:', e);
//     return res.status(500).json({ success: false, message: 'Szerver hiba' });
//   }
// };

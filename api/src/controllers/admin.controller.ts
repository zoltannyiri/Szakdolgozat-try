import { Request, RequestHandler, Response } from 'express';
import User from '../models/user.model';
import Loop from '../models/loop.model';
import Comment from '../models/comment.model';
import CreditConfig from "../models/creditConfig.model";
import { getCreditConfig, invalidateCreditConfigCache } from "../utils/creditConfig";
import Notification from '../models/notification.model';

// export const getAllUsers = async (req: Request, res: Response) => {
//   try {
//     const users = await User.find().select('-password'); // ne küldjük vissza a jelszót
//     res.status(200).json({ success: true, users });
//   } catch (error) {
//     res.status(500).json({ message: 'Hiba a felhasználók lekérésekor.', error });
//   }
// };
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    console.log("[getAllUsers] Fetching users...");
    const users = await User.find().select('-password');
    console.log("[getAllUsers] Users fetched:", users.length);
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("[getAllUsers] Error:", error);
    res.status(500).json({ message: 'Hiba a felhasználók lekérésekor.', error });
  }
};

export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const deleted = await User.findByIdAndDelete(userId);
    if (!deleted) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }
    res.status(200).json({ success: true, message: 'Felhasználó törölve.' });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a törlés során.', error });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Érvénytelen szerepkör.' });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'Felhasználó nem található.' });
    }

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Hiba a szerepkör frissítésekor.', error });
  }
}

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    const userCount = await User.countDocuments();
    const loopCount = await Loop.countDocuments();
    const totalDownloads = await Loop.aggregate([{ $group: { _id: null, total: { $sum: "$downloads" } } }]);
    const totalLikes = await Loop.aggregate([{ $group: { _id: null, total: { $sum: "$likes" } } }]);
    const commentCount = await Comment.countDocuments();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const activeUsersCount = await User.countDocuments({
      lastLogin: { $gte: tenMinutesAgo }
    });

    res.json({
      success: true,
      data: {
        users: userCount,
        loops: loopCount,
        comments: commentCount,
        downloads: totalDownloads[0]?.total || 0,
        likes: totalLikes[0]?.total || 0,
        activeUsers: activeUsersCount 
      }
    });
  } catch (error) {
    console.error("[getAdminStats] error:", error);
    res.status(500).json({ success: false, message: "Hiba a statisztikák lekérésekor." });
  }
};


// admin bírálás loopról
export const listLoopsAdmin: RequestHandler = async (req, res) => {
  console.log('[listLoopsAdmin] status=', req.query.status);
  try {
    const { status } = req.query as { status?: 'pending'|'approved'|'rejected' };
    const q: any = {};
    if (status) q.status = status;

    const loops = await Loop.find(q)
      .populate('uploader', 'username')
      .sort({ uploadDate: -1 })
      .lean();

    res.json({ success: true, loops });
    console.log('[listLoopsAdmin] found:', loops.length);
  } catch (e) {
    console.error('listLoopsAdmin error:', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



export const getWeeklyUploads = async (req: Request, res: Response) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);

    const data = await Loop.aggregate([
      {
        $match: {
          uploadDate: { $gte: oneWeekAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$uploadDate" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // hiányzó napokon 0
    const result: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result[key] = 0;
    }

    for (const item of data) {
      result[item._id] = item.count;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("getWeeklyUploads error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getWeeklyRegistrations = async (req: Request, res: Response) => {
  try {
    // utolsó 7 nap
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 6);
    oneWeekAgo.setHours(0, 0, 0, 0);

    const data = await User.aggregate([
      { $match: { createdAt: { $gte: oneWeekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // hiányzó napokon 0
    const result: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      result[key] = 0;
    }
    for (const item of data) {
      result[item._id] = item.count;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("getWeeklyRegistrations error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Összes loop lekérése adminnak
export const getAllLoops = async (req: Request, res: Response) => {
  try {
    const loops = await Loop.find()
      .populate("uploader", "username")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, loops });
  } catch (error) {
    console.error("Hiba a loopok lekérésekor:", error);
    res.status(500).json({ success: false, message: "Szerver hiba" });
  }
};

export const getAllLoopsForAdmin = async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: 'pending'|'approved'|'rejected' };
    const q: any = {};
    if (status) q.status = status;
    const loops = await Loop.find(q)
      .populate('uploader', 'username')
      .sort({ uploadDate: -1 })
      .lean(); 

    const formatted = loops.map((loop: any) => ({
      _id: loop._id,
      title: loop.filename ?? 'Ismeretlen',
      username: loop.uploader?.username || 'Ismeretlen',
      createdAt: loop.uploadDate ?? new Date(),
      likes: loop.likes ?? 0,
      downloads: loop.downloads ?? 0
    }));

    return res.status(200).json({ success: true, loops });
  } catch (error) {
    console.error('getAllLoopsForAdmin error:', error);
    return res.status(500).json({ success: false, message: 'Loopok betöltése sikertelen.' });
  }
};




export const deleteLoopById = async (req: Request, res: Response) => {
  try {
    const loopId = req.params.id;
    const deletedLoop = await Loop.findByIdAndDelete(loopId);

    if (!deletedLoop) {
      return res.status(404).json({ success: false, message: 'Loop nem található.' });
    }

    res.json({ success: true, message: 'Loop sikeresen törölve.' });
  } catch (error) {
    console.error('[deleteLoopById] Hiba a törlés során:', error);
    res.status(500).json({ success: false, message: 'Szerverhiba a loop törlésekor.' });
  }
};

// creditek módosítása
export const getCreditSettings = async (_req: Request, res: Response) => {
  try {
    const cfg = await getCreditConfig();
    res.json({ success: true, data: cfg });
  } catch (e) {
    console.error("[getCreditSettings]", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const updateCreditSettings = async (req: Request, res: Response) => {
  try {
    const payload: Partial<{
      initialCreditsForNewUser: number;
      bonusOnVerify: number;
      creditsPerApprovedUpload: number;
      downloadCost: number;
      rewardPerDownloadToUploader: number;
    }> = req.body || {};


    const cfg = await CreditConfig.findOne();
    if (!cfg) {
      const created = await CreditConfig.create(payload);
      invalidateCreditConfigCache();
      return res.json({ success: true, data: created });
    }


    if (payload.initialCreditsForNewUser != null)
      cfg.initialCreditsForNewUser = Number(payload.initialCreditsForNewUser);
    if (payload.bonusOnVerify != null)
      cfg.bonusOnVerify = Number(payload.bonusOnVerify);
    if (payload.creditsPerApprovedUpload != null)
      cfg.creditsPerApprovedUpload = Number(payload.creditsPerApprovedUpload);
    if (payload.downloadCost != null)
      cfg.downloadCost = Number(payload.downloadCost);
    if (payload.rewardPerDownloadToUploader != null)
      cfg.rewardPerDownloadToUploader = Number(payload.rewardPerDownloadToUploader);


    cfg.updatedAt = new Date();
    await cfg.save();
    invalidateCreditConfigCache();
    res.json({ success: true, data: cfg });
  } catch (e) {
    console.error("[updateCreditSettings]", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const approveLoopAdmin: RequestHandler = async (req: any, res) => {
  try {
    const { id } = req.params;
    const loop = await Loop.findById(id);
    if (!loop) return res.status(404).json({ success: false, message: 'Loop nem található' });

    const prevStatus = loop.status;

    loop.status = 'approved';
    loop.rejectReason = '';
    loop.moderatedBy = req.user?.userId || null;
    loop.moderatedAt = new Date();
    await loop.save();

    // kredit az uploadernek
    const cfg = await getCreditConfig();
    await User.findByIdAndUpdate(loop.uploader, { $inc: { credits: cfg.creditsPerApprovedUpload ?? 0 } });


    if (prevStatus !== 'approved') {
      await Notification.create({
        userId: loop.uploader,
        type: 'loop_approved',
        message: `A(z) “${loop.filename}” loopodat jóváhagytuk.`,
        relatedItemId: loop._id
      });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('approveLoopAdmin error:', e);
    return res.status(500).json({ success: false, message: 'Szerver hiba' });
  }
};

export const rejectLoopAdmin: RequestHandler = async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const loop = await Loop.findById(id);
    if (!loop) return res.status(404).json({ success: false, message: 'Loop nem található' });

    const prevStatus = loop.status;

    loop.status = 'rejected';
    loop.rejectReason = (reason || '').trim();
    loop.moderatedBy = req.user?.userId || null;
    loop.moderatedAt = new Date();
    await loop.save();

    
    if (prevStatus !== 'rejected') {
      await Notification.create({
        userId: loop.uploader,
        type: 'loop_rejected',
        message: `A(z) “${loop.filename}” loopodat elutasítottuk${loop.rejectReason ? `: ${loop.rejectReason}` : '.'}`,
        relatedItemId: loop._id
      });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('rejectLoopAdmin error:', e);
    return res.status(500).json({ success: false, message: 'Szerver hiba' });
  }
};
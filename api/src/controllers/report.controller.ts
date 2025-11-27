import { Request, Response } from 'express';
import Comment from '../models/comment.model';
import Report from '../models/report.model';
import { CustomRequest } from '../middlewares/auth.middleware';
import Loop from '../models/loop.model';
import User from '../models/user.model';


type PopulatedComment = {
  _id: any;
  text: string;
  user?: { _id: any; username: string };
  loop?: { _id: any; filename: string };
};



export const createCommentReport = async (req: CustomRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { message } = req.body;
    const reporterId = req.user?.userId;

    if (!reporterId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Report message is required' });
    }

    const comment = await Comment.findById(commentId)
      .populate('user', '_id username')
      .populate('loop', '_id filename')
      .lean<PopulatedComment | null>();

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

   
    const report = new Report({
      type: 'comment',
      targetId: comment._id,
      targetOwnerId: comment.user?._id || undefined,
      reporterId,                    
      reporter: reporterId,          
      message: message.trim(),
      status: 'pending',            
      meta: {
        commentText: comment.text,
        loopId: comment.loop?._id,
        loopTitle: comment.loop?.filename
      }
    });

    const saved = await report.save();
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('[createCommentReport] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


export async function createLoopReport(req: Request, res: Response) {
  try {
    const { loopId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'A jelentés indoklása túl rövid.' });
    }

    const loop = await Loop.findById(loopId).populate('uploader', '_id username');
    if (!loop) {
      return res.status(404).json({ success: false, message: 'A loop nem található.' });
    }

    const reporterId = (req as any).user?.id || (req as any).user?._id;
    const doc = await Report.create({
      type: 'loop',
      targetId: loop._id,
      reporter: reporterId,
      reporterId,
      targetOwnerId: loop.uploader?._id || loop.uploader,
      message: message.trim(),
      status: 'pending',
      meta: {
        loopId: loop._id,
        loopTitle: loop.filename
      }
    });

    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[createLoopReport] error:', err);
    return res.status(500).json({ success: false, message: 'Szerverhiba a jelentés mentésekor.' });
  }
}


export const createProfileReport = async (req: CustomRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    const reporterId = req.user?.userId;

    if (!reporterId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Report message is required' });
    }

    const user = await User.findById(userId).select('_id username');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const report = await Report.create({
      type: 'profile',
      targetId: user._id,
      targetOwnerId: user._id,  
      reporterId,               
      reporter: reporterId,     
      message: message.trim(),
      status: 'pending',
      meta: { username: user.username }
    });

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('[createProfileReport] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// jelentés statisztika
export const getReportCounts = async (req: Request, res: Response) => {
  try {
    const rows = await Report.aggregate([
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 }
        }
      }
    ]);

    const byType: Record<string, { total: number; pending: number; resolved: number; rejected: number }> = {};
    let totals = { total: 0, pending: 0, resolved: 0, rejected: 0 };

    for (const r of rows) {
      const t = r._id.type as string;
      const s = r._id.status as 'pending' | 'resolved' | 'rejected';
      const c = r.count as number;

      if (!byType[t]) byType[t] = { total: 0, pending: 0, resolved: 0, rejected: 0 };
      byType[t].total += c;
      byType[t][s] += c;

      totals.total += c;
      (totals as any)[s] += c;
    }

    
    for (const t of ['comment', 'loop', 'profile']) {
      if (!byType[t]) byType[t] = { total: 0, pending: 0, resolved: 0, rejected: 0 };
    }

    return res.json({ success: true, data: { totals, byType } });
  } catch (err) {
    console.error('[getReportCounts] error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// admin jelentések lekérdezése
export const listReports = async (req: Request, res: Response) => {
  try {
    const { type, status = 'pending' } = req.query as {
      type?: 'comment' | 'loop' | 'profile';
      status?: 'pending' | 'resolved' | 'rejected';
    };

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        
        .populate({ path: 'reporter', select: '_id username' })
        .populate({ path: 'reporterId', select: '_id username' })
        .lean(),
      Report.countDocuments(filter),
    ]);

    // betöltések
    const enriched = await Promise.all(
      items.map(async (r: any) => {
        if (r.type === 'comment') {
          const c = await Comment.findById(r.targetId)
            .populate({ path: 'user', select: '_id username' })
            .populate({ path: 'loop', select: '_id filename' })
            .lean<PopulatedComment | null>();

          // meta feltöltése, ha hiányos
          const meta = {
            ...(r.meta || {}),
            commentText: c?.text ?? r.meta?.commentText,
            loopId: c?.loop?._id ?? r.meta?.loopId,
            loopTitle: c?.loop?.filename ?? r.meta?.loopTitle,
            targetOwnerId: c?.user?._id ?? r.meta?.targetOwnerId,
          };

          return {
            ...r,
            target: c || null,
            meta,
           
            reporter: r.reporter || r.reporterId || null,
          };
        }

        if (r.type === 'loop') {
          const loop = await Loop.findById(r.targetId)
            .populate({ path: 'uploader', select: '_id username' })
            .lean();

          const meta = {
            ...(r.meta || {}),
            loopId:    loop?._id ?? r.meta?.loopId,
            loopTitle: loop?.filename ?? r.meta?.loopTitle,
          };

          let target: any = null;
          if (loop) {
            const uploader: any = loop.uploader;
            target = {
              _id: loop._id,
              filename: loop.filename,
              user: uploader
                ? { _id: uploader._id || uploader, username: uploader.username }
                : undefined,
              createdAt: loop.uploadDate,
            };
          }

          return {
            ...r,
            target,
            targetOwnerId: loop?.uploader?._id ?? loop?.uploader ?? r.targetOwnerId,
            meta,
            reporter: r.reporter || r.reporterId || null,
          };
        }

         if (r.type === 'profile') {
          const userId = r.targetOwnerId || r.targetId;
          const u = userId
            ? await User.findById(userId).select('_id username').lean()
            : null;

          const meta = {
            ...(r.meta || {}),
            username: u?.username ?? r.meta?.username, // meta.username kitöltése, ha hiányzott
          };

          return {
            ...r,
            target: u || null,
            meta,
            reporter: r.reporter || r.reporterId || null,
          };
        }
       
        return {
          ...r,
          reporter: r.reporter || r.reporterId || null,
        };
      })
    );

    return res.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e) {
    console.error('[listReports] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// jelentés státusz
export const setReportStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: 'pending' | 'resolved' | 'rejected' };

    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Érvénytelen státusz' });
    }

    const updated = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate({ path: 'reporter', select: '_id username' })
      .lean();

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Report nem található' });
    }

    return res.json({ success: true, data: updated });
  } catch (e) {
    console.error('[setReportStatus] error:', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

import express, { Request } from 'express';
import { authenticateToken, CustomRequest } from '../middlewares/auth.middleware';
import { ChatModel } from '../models/chat.model';
import { checkVerified } from '../middlewares/verify.middleware';
import User from '../models/user.model';
import { send } from 'process';

// import { CustomRequest } from '../types/custom-request';

const router = express.Router();

router.get('/messages', authenticateToken, checkVerified, async (req: Request & { user?: any }, res) => {
  const currentUserId = req.user.userId;
  const otherId = req.query.receiverId as string;
  if (!otherId) return res.status(400).json({ message: 'receiverId szükséges' });

  try {
    const messages = await ChatModel.find({
      $or: [
        { senderId: currentUserId, receiverId: otherId },
        { senderId: otherId,        receiverId: currentUserId }
      ]
    }).sort({ timestamp: 1 });

    const ids = Array.from(new Set(
      messages.flatMap(m => [m.senderId, m.receiverId])
    ));

    const users = await User.find({ _id: { $in: ids } })
      .select('username profileImage')
      .lean();

    const usersById = users.reduce((acc: any, u: any) => {
      acc[u._id.toString()] = { username: u.username, profileImage: u.profileImage || null };
      return acc;
    }, {});

    res.json({ messages, users: usersById });
  } catch (err) {
    console.error('[Chat] Hiba /messages-nél:', err);
    res.status(500).json({ message: 'Szerver hiba' });
  }
});


// ÚJ: Üzenetek olvasottra állítása
router.put('/messages/mark-read/:fromUserId', authenticateToken, checkVerified, async (req: CustomRequest, res) => {
  const currentUserId = req.user.userId;
  const fromUserId = req.params.fromUserId;

  try {
    await ChatModel.updateMany(
      { senderId: fromUserId, receiverId: currentUserId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Hiba az üzenetek olvasottra állításakor:', error);
    res.status(500).json({ message: 'Szerver hiba' });
  }
});


router.get('/chats/summary', authenticateToken, checkVerified, async (req: Request & { user?: any }, res) => {
  const currentUserId = req.user.userId;

  try {
    const chats = await ChatModel.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        }
      },
      {
        $project: {
          participants: {
            $cond: [
              { $lt: ["$senderId", "$receiverId"] },
              ["$senderId", "$receiverId"],
              ["$receiverId", "$senderId"]
            ]
          },
          content: 1,
          timestamp: 1,
          senderId: 1
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$participants",
          lastMessage: { $first: "$content" },
          timestamp: { $first: "$timestamp" },
          lastSenderId: { $first: "$senderId" }
        }
      }
    ]);

    const results: any[] = [];

    for (const chat of chats) {
      const [id1, id2] = chat._id;
      const otherUserId = id1 === currentUserId ? id2 : id1;

      if (!otherUserId || otherUserId.length !== 24) continue;

      const otherUser = await User.findById(otherUserId).select('username');
      if (!otherUser) continue;

      results.push({
        userId: otherUserId,
        username: otherUser.username,
        lastMessage: chat.lastMessage,
        timestamp: chat.timestamp,
        lastSenderId: chat.lastSenderId
      });
    }

    return res.json({ chats: results });

  } catch (err) {
    console.error('[Chat Summary] Hiba:', err);
    return res.status(500).json({ message: 'Szerver hiba' });
  }
});


export default router;


// import express, { Request } from 'express';
// import { authenticateToken } from '../middlewares/auth.middleware';
// import { ChatModel } from '../models/chat.model';

// const router = express.Router();

// router.get('/messages', authenticateToken, async (req: Request & { user?: any }, res) => {
//   const senderId = req.user?.userId;
//   const receiverId = req.query.receiverId as string;

//   if (!receiverId) {
//     return res.status(400).json({ message: 'receiverId szükséges a lekérdezéshez' });
//   }

//   try {
//     const messages = await ChatModel.find({
//       $or: [
//         { senderId, receiverId },
//         { senderId: receiverId, receiverId: senderId }
//       ]
//     }).sort({ timestamp: 1 });

//     res.json({ messages });
//   } catch (err) {
//     console.error('[Chat] Hiba az üzenetek lekérdezésekor:', err);
//     res.status(500).json({ message: 'Szerver hiba' });
//   }
// });

// export default router;

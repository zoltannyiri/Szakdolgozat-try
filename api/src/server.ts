import express, { Application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";
import loginRoutes from "./controllers/login.controller";
import registerRoutes from "./controllers/register.controller";
import favoriteRoutes from "./routes/favorite.routes";
import http from "http";
import User from "./models/user.model";
import { authenticateToken } from "./middlewares/auth.middleware";
import { validateUser } from "./middlewares/validation.middleware";
import { upload as uploadMiddleware, validateLoopMetadata } from "./middlewares/upload.middleware";
import { uploadLoop, getLoops, downloadLoop } from "./controllers/loop.controller";
import loopRoutes from "./routes/loop.routes";
import Notification from './models/notification.model';
import { likeLoop, unlikeLoop } from "./controllers/loop.controller";
import { ChatModel } from './models/chat.model';
import { Server as SocketIOServer } from 'socket.io';
import chatRoutes from './routes/chat.routes';
import multer from 'multer';
import adminRoutes from './routes/admin.routes';
import profileRoutes from "./routes/profile.routes";
import reportRoutes from './routes/report.routes';
import { blockIfBanned } from './middlewares/ban.middleware';
import { checkVerifiedOrBanned } from "./middlewares/userAccess.guard";
import verifyRoutes from './routes/verify.routes';
import { sendVerificationEmail } from './utils/mailer';
import googleAuthRoutes from './routes/google-auth.routes';
import googleOAuthRoutes from "./routes/google-oauth";
import filesRouter from './routes/files';
import userCommentsRoutes from './routes/comment.routes';



dotenv.config({
    path: path.join(__dirname, "/.env"),
});
console.log("MONGODB_URL:", process.env.MONGODB_URL);

const app: Application = express();
const PORT: number = 3000;
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads/avatars/'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});
const uploadAvatar = multer({ storage });

app.use(cors());
app.use(express.json());


mongoose
  .connect(process.env.MONGODB_URL_LOGIN as string, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as mongoose.ConnectOptions)
  .then(() => {
    console.log("Connected to MongoDB!");
  })
  .catch((err: Error) => {
    console.error("MongoDB connection error:", err);
  });

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
app.use("/api", registerRoutes); 
app.use("/api", loginRoutes);
app.use('/api', googleAuthRoutes);



interface CustomRequest extends Request {
    user?: any;
}

interface DecodedToken {
    user: any;
}
// Profilkép feltöltése
app.post('/api/profile/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), async (req: CustomRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
      }

    

    user.profileImage = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ imageUrl: user.profileImage });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Értesítések lekérése
app.get('/api/notifications', authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .populate({
        path: 'user',
        select: 'username profileImage',
        model: 'User'
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Hiba:', error);
    res.status(500).json({ message: 'Szerver hiba' });
  }
});

function getNotificationText(type: string): string {
  switch(type) {
    case 'comment': return 'kommentelt egy loopod alatt';
    case 'download': return 'letöltötte a loopodat';
    default: return 'interakciót végzett a loopoddal';
  }
}

// Értesítés olvasottá tétele
app.put('/api/notifications/:id/read', authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Értesítés nem található' });
    }
    
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Szerver hiba' });
  }
});


// Minden értesítés olvasottá tétele
app.put('/api/notifications/read-all', authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    await Notification.updateMany(
      { userId: req.user.userId, read: false },
      { $set: { read: true } }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Szerver hiba' });
  }
});

app.get('/api/validate-token', authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ isValid: false });
    }
    res.json({ isValid: true });
  } catch (error) {
    res.status(401).json({ isValid: false });
  }
});





//email validálás
app.get('/api/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    const user = await User.findOne({ 
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Érvénytelen vagy lejárt token" 
      });
    }


    user.isVerified = true;
    await user.updateOne({
      $unset: {
        verificationToken: "",
        verificationTokenExpires: ""
      },
      $set: {
        isVerified: true
      }
    });

    res.json({ message: "Email cím sikeresen megerősítve" });
  } catch (error) {
    console.error("Email megerősítési hiba:", error);
    res.status(500).json({ message: "Szerver hiba" });
  }
});

//chat
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, content } = data;

    const message = new ChatModel({
      senderId,
      receiverId,
      content,
      timestamp: new Date(),
    });

    await message.save();

    io.to(receiverId).emit('receiveMessage', message);
  });

  socket.on('joinRoom', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });

  socket.on('markAsRead', async ({ senderId, receiverId }) => {
  await ChatModel.updateMany(
    { senderId, receiverId, read: false },
    { $set: { read: true } }
  );

  io.to(senderId).emit('messagesReadByReceiver', { by: receiverId });
  });

});

app.use('/api', chatRoutes);

app.use("/api/profile", profileRoutes);

app.use('/api', verifyRoutes);
const allowedOrigins = [
  'http://localhost:4200', 
  'https://szakdolgozat-frontend-pi.vercel.app',   
  'https://szakdolgozat-frontend.vercel.app',
  'https://loop-hub.vercel.app'
];
app.use("/api", loopRoutes); 

app.use(cors({
  // origin: 'http://localhost:4200',
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS: Rejected request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));


//likeolás
app.post('/api/loop-detail/:id/like', authenticateToken, checkVerifiedOrBanned, likeLoop);
app.post('/api/loop-detail/:id/unlike', authenticateToken, checkVerifiedOrBanned, unlikeLoop);

//favorite hozzáadás
app.use("/api", favoriteRoutes);


//ADMIN
app.use('/api/admin', adminRoutes);

console.log("Available routes:");
app._router.stack.forEach((r: any) => {
  if (r.route && r.route.path) {
    console.log(`${Object.keys(r.route.methods)[0].toUpperCase()} ${r.route.path}`);
  }
});


//BAN TILTÁS
app.post('/api/loop-detail/:id/like', authenticateToken, blockIfBanned, likeLoop);
app.post('/api/loop-detail/:id/unlike', authenticateToken, blockIfBanned, unlikeLoop);


//REPORT
app.use('/api', reportRoutes);

// oauth
app.use("/api/google", googleOAuthRoutes);

app.use('/api', filesRouter);


// kommentek
app.use('/api', userCommentsRoutes);


console.log("Registering admin routes...");
console.log("Admin routes registered");

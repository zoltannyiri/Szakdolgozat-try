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
    methods: ['GET', 'POST']
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


app.use(express.json());
app.use(cors());

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

// app.post("/api/register", async (req, res) => {
//     try{
//         const { username, email, password } = req.body;
//         const existingUser = await User.findOne({ username });
//         if (existingUser) {
//             return res.status(400).json({ message: "Username already exists" });
//         }
//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newUser = new User({
//             username,
//             email,
//             password: hashedPassword,
//             role: "user",
//         });

//         await newUser.save();
//         res.status(201).json({ message: "Registration successful" });
//     }
//     catch (error) {
//         console.error("Registration error:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });

app.use("/api", registerRoutes); //ird át authra

app.use("/api", loginRoutes);

// törölve mert átraktam a login.controllerbe
// app.post("/api/login", async (req, res) => {
//     try{
//         const { username, password } = req.body;
//         const user = await User.findOne({ username });

//         if (!user){
//             return res.status(400).json({ message: "Invalid login credentials" });
//         }

//         const isMatch = await bcrypt.compare(password, user.password);
//         if (!isMatch){
//             return res.status(400).json({ message: "Invalid login credentials" });
//         }

//         const token = jwt.sign({
//             userId: user._id,
//             email: user.email,
//         }, process.env.JWT_SECRET as string, {
//             expiresIn: "1h",
//         });
        
//         res.json({ token, user: {email: user.email} });
//     }
//     catch (error) {
//         console.error("Registration error:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });


// function authenticateToken(req, res, next){
//     const authHeader = req.headers["authorization"];
//     const token = authHeader && authHeader.split(" ")[1];
//     if (!token) return res.sendStatus(401).json({ message: "No token provided, authorization denied"});

//     try{
//         const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
//         req.user = decoded;
//         next();

//     }catch (error){
//         return res.status(403).json({ message: "Invalid or expired token"});

//     jwt.verify(token, process.env.JWT_SECRET as string, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// } ezalatti ugyanez .ts-ben átírva és kikegészítve?

interface CustomRequest extends Request {
    user?: any;
}

interface DecodedToken {
    user: any;
}

app.get("/api/profile", authenticateToken, async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user.userId;
      const user = await User.findById(userId).select("-password");
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      return res.json({ user });
    } catch (error) {
      console.log("Error fetching profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });


  //létrehozva: 03. 24. 
  app.get("/api/profile/:username", async (req: CustomRequest, res: Response) => {
    try {
      const { username } = req.params;  // Az URL-ben szereplő felhasználónév
      const user = await User.findOne({ username }).select("-password");  // Megkeressük a felhasználót
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      return res.json({ user });
    } catch (error) {
      console.log("Error fetching profile:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // A PUT végpont hozzáadása (aboutme miatt)
app.put("/api/profile", authenticateToken, async (req: CustomRequest, res: Response) => {
  try {
    const { aboutMe } = req.body;  // A frissített adat
    const userId = req.user.userId;  // A bejelentkezett felhasználó ID-ja

    // A felhasználó keresése ID alapján
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // A felhasználó adatainak frissítése
    user.aboutMe = aboutMe;
    await user.save();  // Az adatok mentése

    return res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.log("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});


//avatar feltöltés, 05.31.
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




//ÉRTESÍTÉSEK
// Értesítések lekérdezése
// // Értesítések lekérdezése
// app.get('/api/notifications', authenticateToken, async (req: CustomRequest, res: Response) => {
//   try {
//     const notifications = await Notification.find({ userId: req.user.userId })
//       .populate<{ user: { username: string; profileImage?: string } }>({
//         path: 'user',
//         select: 'username profileImage',
//         model: 'User'
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     const formattedNotifications = notifications.map(notification => {
//       // Explicit típus definiálás
//       const user = notification.user as { username: string; profileImage?: string } | undefined;
      
//       return {
//         ...notification,
//         message: notification.message,
//         user: user ? {
//           username: user.username,
//           profileImage: user.profileImage // Opcionális mező
//         } : undefined
//       };
//     });

//     res.status(200).json({
//       success: true,
//       data: formattedNotifications
//     });
//   } catch (error) {
//     console.error('Hiba:', error);
//     res.status(500).json({ message: 'Szerver hiba' });
//   }
// });

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
    // ... egyéb típusok
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

  
  







// áthelyezve a middlewarebe
// export const authenticateToken = (req: CustomRequest, res: Response, next: NextFunction) =>{
//     const authHeader = req.headers["authorization"];
//     const token = authHeader && authHeader.split(" ")[1];
//     if (!token) return res.status(401).json({ message: "No token provided, authorization denied"});

//     try{
//         const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken;
//         // req.user = decoded.user; ez nem működik, mert a `decoded` objektum nem tartalmazza a `user` kulcsot

//         req.user = decoded;
//         next();

//     }catch (error){
//         return res.status(403).json({ message: "Invalid or expired token"});
//     }

//     // jwt.verify(token as string, process.env.JWT_SECRET as string, (err, user) => {
//     //     if (err) return res.sendStatus(403);
//     //     req.user = user;
//     //     next();
//     // });
// }

app.get("/api/profile", authenticateToken, async (req: CustomRequest, res: Response) => {
    try{
        const userId = req.user.userId;
        const user = await User.findById(userId).select("-password");

        if (!user){
            return res.status(404).json({ message: "User not found" });
        }
        console.log(user.username)
        return res.json({ user });
    } catch (error){
        console.log("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
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
//módosítva: 2025. 04. 27
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

    // Módosított rész: $unset operátor használata
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
// //email validálás újraküldése
// app.post('/api/resend-verification', authenticateToken, async (req: CustomRequest, res: Response) => {
//   try {
//     const user = await User.findById(req.user.userId);
//     if (!user) return res.status(404).json({ message: "User not found" });
    
//     if (user.isVerified) {
//       return res.status(400).json({ message: "User already verified" });
//     }
    
//     // Token generálás és mentés
//     const verificationToken = crypto.randomBytes(20).toString('hex');
//     user.verificationToken = verificationToken;
//     user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 óra
//     await user.save();
    
//     // Email küldése
//     await sendVerificationEmail(user.email, verificationToken);
    
//     res.json({ message: "Verification email sent" });
//   } catch (error) {
//     console.error("Resend verification error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// });




//chat
// Socket.IO logic
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

  // Küldj vissza jelet a küldőnek
  io.to(senderId).emit('messagesReadByReceiver', { by: receiverId });
  });

});

app.use('/api', chatRoutes);







// feltöltés
app.use("/api", loopRoutes);
// Loop routes közvetlenül a server.ts-ben
app.use("/api", loopRoutes);  // "/api/upload", "/api/loops" stb. lesz az útvonal

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));


//likeolás
app.post('/api/loop-detail/:id/like', authenticateToken, likeLoop);
app.post('/api/loop-detail/:id/unlike', authenticateToken, unlikeLoop);



//favorite hozzáadás
app.use("/api", favoriteRoutes);

// commented at 03.11 19:00
// import App from "./app";
// import loginController from "./controllers/login.controller";

// const app = new App([loginController]);

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

import User from "./models/user.model";
import { authenticateToken } from "./middlewares/auth.middleware";
import { validateUser } from "./middlewares/validation.middleware";


dotenv.config({
    path: path.join(__dirname, "/.env"),
});
console.log("MONGODB_URL:", process.env.MONGODB_URL);

const app: Application = express();
const PORT: number = 3000;

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

app.listen(PORT, () => {
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



// commented at 03.11 19:00
// import App from "./app";
// import loginController from "./controllers/login.controller"; // FIGYELD: kisbetűs név!

// const app = new App([loginController]); // NE használj `new`-t

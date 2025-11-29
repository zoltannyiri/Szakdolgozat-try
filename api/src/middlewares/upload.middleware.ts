import multer from "multer";
import * as yup from "yup";
import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// Feltöltési mappa létrehozása, ha nem létezik
// const uploadDir = path.join(__dirname, "../uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// Multer konfiguráció
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// export const upload = multer({ 
//     storage: storage,
//     limits: { 
//       fileSize: 50 * 1024 * 1024, // 50MB
//       fields: 10, // Number of non-file fields
//       parts: 20 // Total parts (files + fields)
//     },
//     fileFilter: (req, file, cb) => {
//       if (file.mimetype.startsWith('audio/')) {
//         cb(null, true);
//       } else {
//         cb(new Error('Only audio files are allowed!'));
//       }
//     }
//   });

// const storage = multer.memoryStorage();
export const upload = multer({
  storage:  multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    fields: 10,
    parts: 20,
  },
  // fileFilter: (req, file, cb) => {
  //   if (file.mimetype.startsWith('audio/')) cb(null, true);
  //   else cb(new Error('Only audio files are allowed!'));
  // }
  // fileFilter: (req, file, cb) => {
  //   file.mimetype.startsWith('audio/') ? cb(null, true) : cb(new Error('Only audio files are allowed!'));
  // }
  fileFilter: (req, file, cb) => {
    const ok = [
      'audio/wav', 'audio/x-wav',
      'audio/aiff', 'audio/x-aiff'
    ].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Csak WAV/AIFF kiterjesztésű fájl tölthető fel!'));
  }
});

// Metaadatok validációs séma
export const loopMetadataSchema = yup.object().shape({
    bpm: yup.number().required().positive().integer().min(30).max(600),
    key: yup.string().required(),
    scale: yup.string().required().oneOf(["Hip Hop", 
    "Trap", 
    "Rap",
    "Drill", 
    "R&B", 
    "Pop", 
    "Lo-Fi", 
    "EDM", 
    "House", 
    "Techno", 
    "Dubstep", 
    "Cinematic", 
    "Rock", 
    "Jazz", 
    "Afrobeat", 
    "Reggaeton",
    "Ambient",
    "Funk",
    "Soul"]),
    tags: yup.array().of(yup.string()),
    instrument: yup.string().required(),
    customName: yup.string().optional().max(100)
  });

//   export const validateLoopMetadata = async (req: Request, res: Response, next: NextFunction) => {
//   try {
    
//     if (req.body?.metadata) {
//       let metadata: any;
//       try {
//         metadata = typeof req.body.metadata === 'string'
//           ? JSON.parse(req.body.metadata)
//           : req.body.metadata;
//       } catch {
//         return res.status(400).json({ message: 'Invalid metadata JSON' });
//       }

//       try {
//         await loopMetadataSchema.validate(metadata, { abortEarly: false });
//       } catch (err: any) {
//         return res.status(400).json({ message: 'Validation failed', errors: err.errors });
//       }

//       // összefésülés a body-val
//       req.body = { ...req.body, ...metadata };
//       return next();
//     }

//     // külön mezők
//     try {
//       await loopMetadataSchema.validate(req.body, { abortEarly: false });
//     } catch (err: any) {
//       return res.status(400).json({ message: 'Validation failed', errors: err.errors });
//     }

//     return next();
//   } catch (err) {
//     console.error('validateLoopMetadata error:', err);
//     return res.status(500).json({ message: 'Server error' });
//   }
// };

export const validateLoopMetadata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body?.metadata) {
      let metadata: any;
      try {
        metadata = typeof req.body.metadata === 'string' ? JSON.parse(req.body.metadata) : req.body.metadata;
      } catch {
        return res.status(400).json({ message: 'Invalid metadata JSON' });
      }
      try {
        await loopMetadataSchema.validate(metadata, { abortEarly: false });
      } catch (err: any) {
        return res.status(400).json({ message: 'Validation failed', errors: err.errors });
      }
      req.body = { ...req.body, ...metadata };
      return next();
    }

    try {
      await loopMetadataSchema.validate(req.body, { abortEarly: false });
    } catch (err: any) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    return next();
  } catch (err) {
    console.error('validateLoopMetadata error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

import multer from "multer";
import * as yup from "yup";
import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";

// Feltöltési mappa létrehozása, ha nem létezik
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer konfiguráció
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ 
    storage: storage,
    limits: { 
      fileSize: 50 * 1024 * 1024, // 50MB
      fields: 10, // Number of non-file fields
      parts: 20 // Total parts (files + fields)
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed!'));
      }
    }
  });

// Metaadatok validációs séma
export const loopMetadataSchema = yup.object().shape({
    bpm: yup.number().required().positive().integer(),
    key: yup.string().required(),
    scale: yup.string().required().oneOf(["major", "minor", "dorian", "phrygian", "lydian", "mixolydian", "locrian"]),
    tags: yup.array().of(yup.string()),
    instrument: yup.string().required(),
    customName: yup.string().optional().max(100) // Opcionális, max 100 karakteres név
  });

  export const validateLoopMetadata = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ha JSON-ban jönnek a metaadatok
      if (req.body.metadata) {
        const metadata = JSON.parse(req.body.metadata);
        await loopMetadataSchema.validate(metadata, { abortEarly: false });
        req.body = { ...req.body, ...metadata }; // Összefésülés
      } else {
        // Ha külön mezőkben jönnek
        await loopMetadataSchema.validate(req.body, { abortEarly: false });
      }
      next();
    } catch (err: any) {
      return res.status(400).json({
        message: "Validation failed",
        errors: err.errors
      });
    }
  };
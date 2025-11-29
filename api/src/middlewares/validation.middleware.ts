import { Request, Response, NextFunction } from "express";
import * as yup from "yup";

// Felhasználó validációs séma
const userValidationSchema = yup.object({
  username: yup.string()
    .required("Felhasználónév megadása kötelező")
    .min(3, "A felhasználónévnek legalább 3 karakter hosszúnak kell lennie")
    .max(20, "A felhasználónév nem lehet hosszabb 20 karakternél")
    .matches(/^[a-zA-Z0-9_]+$/, "A felhasználónév csak betűket, számokat és aláhúzásokat tartalmazhat"),
  
  email: yup.string()
    .email("Helytelen email formátum")
    .required("Email megadása kötelező")
    .max(100, "Email nem lehet hosszabb 100 karakternél"),
  
  password: yup.string()
    .required("A jelszó megadása kötelező")
    .min(6, "A jelszónak legalább 6 karakter hosszúnak kell lennie")
    .max(50, "A jelszó nem lehet hosszabb 50 karakternél"),
    
  country: yup.string()
    .required("Ország megadása kötelező")
});

// Loop metaadatok validációs séma
export const loopMetadataSchema = yup.object({
  bpm: yup
    .number()
    .required('BPM megadása kötelező')
    .min(40, 'A BPM értékének legalább 40-nek kell lennie')
    .max(300, 'A BPM értéke nem haladhatja meg a 300-at'),

  key: yup
    .string()
    .required('Kulcs megadása kötelező')
    .max(4, 'A kulcs nem lehet hosszabb 4 karakternél'),

  genre: yup
    .string()
    .required('Hangszer megadása kötelező')
    .max(50, 'A hangszer nem lehet hosszabb 50 karakternél'),

  category: yup
    .string()
    .required('Kategória megadása kötelező')
    .max(50, 'A kategória nem lehet hosszabb 50 karakternél'),

  tags: yup
    .array()
    .of(yup.string().max(20, 'A tag nem lehet hosszabb 20 karakternél')),

  customName: yup
    .string()
    .max(50, 'Egyedi név nem lehet hosszabb 50 karakternél')
});

// Felhasználó adatok validáció séma
export const validateUser = (req: Request, res: Response, next: NextFunction) => {
  userValidationSchema
    .validate(req.body, { abortEarly: false })
    .then(() => next())
    .catch((err: yup.ValidationError) => {
      const errors = err.inner.reduce((acc: Record<string, string>, error) => {
        if (error.path) {
          acc[error.path] = error.message;
        }
        return acc;
      }, {});
      
      res.status(400).json({ 
        success: false,
        message: "Hiba történt",
        errors 
      });
    });
};


// profil adatok
const generalProfileSchema = yup.object({
  firstName: yup.string().max(50),
  lastName: yup.string().max(50),
  country: yup.string().max(50),
  city: yup.string().max(50),
  aboutMe: yup.string().max(1000)
});

export const validateGeneralProfile = (req: Request, res: Response, next: NextFunction) => {
  generalProfileSchema
    .validate(req.body, { abortEarly: false })
    .then(() => next())
    .catch((err: yup.ValidationError) => {
      const errors = err.inner.reduce((acc: Record<string, string>, error) => {
        if (error.path) acc[error.path] = error.message;
        return acc;
      }, {});
      res.status(400).json({ success: false, message: "Validation failed", errors });
    });
};

const emailChangeSchema = yup.object({
  newEmail: yup.string().email("Invalid email format").required("New email is required"),
  password: yup.string().required("Password is required")
});

export const validateEmailChange = (req: Request, res: Response, next: NextFunction) => {
  emailChangeSchema
    .validate(req.body, { abortEarly: false })
    .then(() => next())
    .catch((err: yup.ValidationError) => {
      const errors = err.inner.reduce((acc: Record<string, string>, error) => {
        if (error.path) acc[error.path] = error.message;
        return acc;
      }, {});
      res.status(400).json({ success: false, message: "Validation failed", errors });
    });
};

const passwordChangeSchema = yup.object({
  currentPassword: yup.string().required("Current password is required"),
  newPassword: yup.string().min(6).max(50).required("New password is required")
});

export const validatePasswordChange = (req: Request, res: Response, next: NextFunction) => {
  passwordChangeSchema
    .validate(req.body, { abortEarly: false })
    .then(() => next())
    .catch((err: yup.ValidationError) => {
      const errors = err.inner.reduce((acc: Record<string, string>, error) => {
        if (error.path) acc[error.path] = error.message;
        return acc;
      }, {});
      res.status(400).json({ success: false, message: "Validation failed", errors });
    });
};

// Loop metaadatok
export const validateLoopMetadata = (req: Request, res: Response, next: NextFunction) => {
  try {
    const metadata = typeof req.body.metadata === 'string' 
      ? JSON.parse(req.body.metadata) 
      : req.body.metadata;
    
    loopMetadataSchema.validateSync(metadata, { abortEarly: false });
    next();
  } catch (error: unknown) {
    if (error instanceof yup.ValidationError) {
      const errors = error.inner.reduce((acc: Record<string, string>, err) => {
        if (err.path) {
          acc[err.path] = err.message;
        }
        return acc;
      }, {});
      
      res.status(400).json({ 
        success: false,
        message: "Invalid loop metadata",
        errors 
      });
    } else {
      res.status(500).json({ 
        success: false,
        message: "Unexpected error during validation",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Bejelentkezés validáció séma
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  yup.object({
    username: yup.string().required("Username or email is required"),
    password: yup.string().required("Password is required")
  })
  .validate(req.body, { abortEarly: false })
  .then(() => next())
  .catch((err: yup.ValidationError) => {
    const errors = err.inner.reduce((acc: Record<string, string>, error) => {
      if (error.path) {
        acc[error.path] = error.message;
      }
      return acc;
    }, {});
    
    res.status(400).json({ 
      success: false,
      message: "Validation failed",
      errors 
    });
  });
};


export function validateSocials(req: Request, res: Response, next: NextFunction) {
  const socials = req.body?.socials;
  if (!socials || typeof socials !== "object") {
    return res.status(400).json({ message: "Invalid socials payload" });
  }

  const allowed = new Set([
    "facebook","instagram","youtube","soundcloud","spotify",
    "tiktok","x","website","email"
  ]);

  for (const [key, val] of Object.entries(socials)) {
    if (!allowed.has(key)) {
      return res.status(400).json({ message: `Unsupported key: ${key}` });
    }
    if (val != null && typeof val !== "string") {
      return res.status(400).json({ message: `Value for ${key} must be a string` });
    }
    if (typeof val === "string" && val.length > 300) {
      return res.status(400).json({ message: `Value for ${key} is too long` });
    }
  }
  next();
}
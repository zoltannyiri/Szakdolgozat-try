import { Request, Response, NextFunction } from "express";
import * as yup from "yup";

// Felhasználó validációs séma
const userValidationSchema = yup.object({
  username: yup.string()
    .required("Username is required")
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot be longer than 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
  
  email: yup.string()
    .email("Invalid email format")
    .required("Email is required")
    .max(100, "Email cannot be longer than 100 characters"),
  
  password: yup.string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters") // Csökkentettük 6 karakterre
    .max(50, "Password cannot be longer than 50 characters"),
    // Eltávolítottuk a komplexitási követelményeket
    
  country: yup.string()
    .required("Country is required")
    .max(50, "Country name cannot be longer than 50 characters")
});

// Loop metaadatok validációs sémája
export const loopMetadataSchema = yup.object({
  bpm: yup
    .number()
    .required('BPM is required')
    .min(40, 'BPM must be at least 40')
    .max(300, 'BPM cannot exceed 300'),

  key: yup
    .string()
    .required('Key is required')
    .max(4, 'Key too long'),

  genre: yup
    .string()
    .required('Genre is required')
    .max(50, 'Genre too long'),

  category: yup
    .string()
    .required('Category is required')
    .max(50, 'Category too long'),

  tags: yup
    .array()
    .of(yup.string().max(20, 'Tag too long'))
    .max(10, 'Max 10 tags'),

  customName: yup
    .string()
    .max(50, 'Custom name too long')
});

// Felhasználó adatok validációja
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


// Általános profil adatok (nem módosít e-mailt/jelszót!)
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

// Loop metaadatok validációja
export const validateLoopMetadata = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Metaadatok kiolvasása (lehet stringként érkezik)
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

// Bejelentkezés validátora
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

//commented at 04. 27
// import { Request, Response, NextFunction } from "express";
// import * as yup from "yup";


// const userValidationSchema = yup.object({
//   username: yup.string().required("Username is required"),
//   email: yup.string().email("Invalid email").required("Email is required"),
//   password: yup
//     .string()
//     .min(6, "Password must be at least 6 characters")
//     .required("Password is required"),
// });

// export const validateUser = (req: Request, res: Response, next: NextFunction) => {
//   userValidationSchema
//     .validate(req.body, { abortEarly: false }) // Validáljuk a kérés törzsét
//     .then(() => {
//       next(); // Ha a validáció sikerült, lépjen a következő middleware-re
//     })
//     .catch((err: { errors: any; }) => {
//       res.status(400).json({ message: "Validation failed", errors: err.errors });
//     });
// };






// commented  at 03.11 19:00
// import { Request, Response, NextFunction } from "express";

// export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
//     const { username, password } = req.body;

//     if (!username || !password) {
//         return res.status(400).json({ message: "Felhasználónév és jelszó szükséges!" });
//     }

//     next();
// };

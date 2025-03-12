import { Request, Response, NextFunction } from "express";
import * as yup from "yup";

// Példa validációs séma (pl. regisztrációhoz)
const userValidationSchema = yup.object({
  username: yup.string().required("Username is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export const validateUser = (req: Request, res: Response, next: NextFunction) => {
  userValidationSchema
    .validate(req.body, { abortEarly: false }) // Validáljuk a kérés törzsét
    .then(() => {
      next(); // Ha a validáció sikerült, lépjen a következő middleware-re
    })
    .catch((err: { errors: any; }) => {
      res.status(400).json({ message: "Validation failed", errors: err.errors });
    });
};






// commented  at 03.11 19:00
// import { Request, Response, NextFunction } from "express";

// export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
//     const { username, password } = req.body;

//     if (!username || !password) {
//         return res.status(400).json({ message: "Felhasználónév és jelszó szükséges!" });
//     }

//     next();
// };

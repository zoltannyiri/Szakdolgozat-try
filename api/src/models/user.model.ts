import mongoose, { Schema, Document } from "mongoose";

// Felhasználó interfész a típusbiztonság miatt
export interface IUser extends Document {
  email: string;
  username: string;
  password: string;
  role: string;
  date: Date;
  country: string;
  city: string;
  firstName: string;
  lastName: string;
  lastLogin: Date;
  aboutMe: string;
  profileImage?: string;
  isVerified: boolean; //módosítva: 2025. 04. 27
  verificationToken?: string; //módosítva: 2025. 04. 27
  verificationTokenExpires?: Date; //módosítva: 2025. 04. 27
}

const UserSchema: Schema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  date: { type: Date, default: Date.now },
  country: { type: String, required: true },
  lastLogin: { type: Date, default: Date.now },
  aboutMe: { type: String, default: "" },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date }
});

// Default exporttal, hogy `import User from "./models/user.model";` működjön
export default mongoose.model<IUser>("User", UserSchema);






// commented at 03.11 19:00
// import mongoose, { Schema, Document } from "mongoose";
// import bcrypt from "bcryptjs";

// export interface IUser extends Document {
//     username: string;
//     password: string;
// }

// const UserSchema: Schema = new Schema({
//     username: { type: String, required: true, unique: true },
//     password: { type: String, required: true }
// });

// // Jelszó hashelése mentés előtt
// UserSchema.pre<IUser>("save", function (next) {
//     if (!this.isModified("password")) return next();
//     const salt = bcrypt.genSaltSync(10);
//     this.password = bcrypt.hashSync(this.password, salt);
//     next();
// });

// const UserModel = mongoose.model<IUser>("User", UserSchema);
// export default UserModel;

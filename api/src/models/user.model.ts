import mongoose, { Schema, Document, Types } from "mongoose";


export interface IUser extends Document {
  email: string;
  username: string;
  // Jelszó csak local esetén kötelező
  password?: string;

  provider: 'local' | 'google';
  googleId?: string;

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

  bannedUntil?: Date | null;
  banReason?: string | null;
  bannedBy?: Types.ObjectId | null;

  // új logika: kredit rendszer a letöltés korlátozására
  credits?: number;
  downloadsTotal?: number;


  // googleId: { type: String, index: true },
}

const UserSchema: Schema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },

  provider:  { type: String, enum: ['local', 'google'], default: 'local', index: true },

  googleId:  { type: String, unique: true, sparse: true },

  // password: { type: String, required: true },
  password:  { 
    type: String, 
    required: function (this: any) { 
      return this.provider === 'local'; 
    } 
  },
  
  role: { type: String, default: "user" },
  date: { type: Date, default: Date.now },
  // country: { type: String, required: true },
  country:  { 
    type: String, 
    required: function (this: any) {
      return this.provider === 'local';
    }
  },
  lastLogin: { type: Date, default: Date.now },
  aboutMe: { type: String, default: "" },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationTokenExpires: { type: Date },

  bannedUntil: { type: Date, default: null },
  banReason:   { type: String, default: "" },
  bannedBy:    { type: Schema.Types.ObjectId, ref: "User", default: null },

  // új lokika: kredit rendszer a letöltés korlátozására
  credits: { type: Number, default: 0 },
  downloadsTotal: { type: Number, default: 0 },
});

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

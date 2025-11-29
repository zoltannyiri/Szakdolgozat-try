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
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;

  bannedUntil?: Date | null;
  banReason?: string | null;
  bannedBy?: Types.ObjectId | null;
  credits?: number;
  downloadsTotal?: number;
  socials?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    soundcloud?: string;
    spotify?: string;
    tiktok?: string;
    x?: string; 
    website?: string;
    email?: string;
  };
}

const UserSchema: Schema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  provider:  { type: String, enum: ['local', 'google'], default: 'local', index: true },
  googleId:  { type: String, unique: true, sparse: true },
  password:  { 
    type: String, 
    required: function (this: any) { 
      return this.provider === 'local'; 
    } 
  },
  role: { type: String, default: "user" },
  date: { type: Date, default: Date.now },
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
  credits: { type: Number, default: 0 },
  downloadsTotal: { type: Number, default: 0 },
  socials: {
    facebook:   { type: String, default: '' },
    instagram:  { type: String, default: '' },
    youtube:    { type: String, default: '' },
    soundcloud: { type: String, default: '' },
    spotify:    { type: String, default: '' },
    tiktok:     { type: String, default: '' },
    x:          { type: String, default: '' },
    website:    { type: String, default: '' },
    email:      { type: String, default: '' }
  }
});

export default mongoose.model<IUser>("User", UserSchema);

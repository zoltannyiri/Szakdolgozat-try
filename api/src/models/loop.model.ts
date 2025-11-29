import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILoop extends Document {
  genre: any;
  _id: string;
  filename: string;
  path: string;
  uploader: mongoose.Types.ObjectId;
  bpm: number;
  key: string;
  scale: string;
  tags: string[];
  instrument: string;
  duration: number;
  uploadDate: Date;
  likes: number;
  likedBy: mongoose.Types.ObjectId[];
  downloads: number;
  driveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderatedBy?: Types.ObjectId | null;
  moderatedAt?: Date | null;
  rejectReason?: string | null;
}

const LoopSchema: Schema = new Schema<ILoop>({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bpm: { type: Number, required: true, index: true },
  key: { type: String, required: true },
  scale: { type: String, required: true },
  tags: { type: [String], default: [] },
  instrument: { type: String, required: true },
  duration: { type: Number, required: true },
  uploadDate: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  downloads: { type: Number, default: 0 },
  driveFileId: { type: String },
  webViewLink: { type: String },
  webContentLink: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  moderatedAt: { type: Date, default: null },
  rejectReason: { type: String, default: '' },
});

export default mongoose.model<ILoop>("Loop", LoopSchema);
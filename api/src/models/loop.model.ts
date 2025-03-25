import mongoose, { Schema, Document } from "mongoose";

export interface ILoop extends Document {
  _id: string; // Explicit string típus
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
  downloads: number;
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
  downloads: { type: Number, default: 0 }
});

export default mongoose.model<ILoop>("Loop", LoopSchema);
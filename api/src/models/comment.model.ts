import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  text: string;
  user: mongoose.Types.ObjectId;
  loop: mongoose.Types.ObjectId;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  text: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  loop: { type: Schema.Types.ObjectId, ref: 'Loop', required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IComment>('Comment', CommentSchema);
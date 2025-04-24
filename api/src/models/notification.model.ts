import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  type: 'comment' | 'download' | 'like' | 'follow';
  message: string;
  relatedItemId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true, enum: ['comment', 'download', 'like', 'follow'] },
  message: { type: String, required: true },
  relatedItemId: { type: Schema.Types.ObjectId },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
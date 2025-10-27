import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  senderId: { 
    type: String, 
    required: true 
  },
  receiverId: 
  { type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now
  }
});

export const ChatModel = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

// export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
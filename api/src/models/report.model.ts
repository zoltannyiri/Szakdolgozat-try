import { Schema, model } from 'mongoose';

export type ReportType = 'comment' | 'loop' | 'profile';
export type ReportStatus = 'pending' | 'resolved' | 'rejected';

const ReportSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['comment', 'loop', 'profile'],
      required: true,
      index: true
    },


    targetId: { type: Schema.Types.ObjectId, required: true, index: true },


    reporter:   { type: Schema.Types.ObjectId, ref: 'User' },
    reporterId: { type: Schema.Types.ObjectId, ref: 'User' },


    targetOwnerId: { type: Schema.Types.ObjectId, ref: 'User' },


    message: { type: String, required: true, trim: true, maxlength: 2000 },


    status: {
      type: String,
      enum: ['pending', 'resolved', 'rejected'],
      default: 'pending',
      index: true
    },


    meta: {
      commentText: { type: String },
      loopId:      { type: Schema.Types.ObjectId, ref: 'Loop' },
      loopTitle:   { type: String }
    }
  },
  { timestamps: true, strict: true }
);

export default model('Report', ReportSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IFavorite extends Document {
  user: mongoose.Types.ObjectId;
  loop: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema: Schema = new Schema<IFavorite>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  loop: { type: Schema.Types.ObjectId, ref: "Loop", required: true },
  createdAt: { type: Date, default: Date.now }
});

FavoriteSchema.index({ user: 1, loop: 1 }, { unique: true });

export default mongoose.model<IFavorite>("Favorite", FavoriteSchema);
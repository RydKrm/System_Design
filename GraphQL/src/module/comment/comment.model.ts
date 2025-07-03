import mongoose, { Document, mongo, Schema } from "mongoose";

export interface IComment extends Document {
  id: string;
  commentText: string;
  commentImage?: [string];
  userId: string;
  productId: mongoose.Types.ObjectId;
}

const CommentSchema: Schema<IComment> = new Schema({
  commentText: { type: String, required: true },
  commentImage: { type: [String] },
  userId: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, required: true },
});

const CommentModel = mongoose.model<IComment>("Comment", CommentSchema);

export default CommentModel;

import mongoose, { Document, model, Schema } from "mongoose";

export interface IReview extends Document {
  id?: mongoose.Types.ObjectId;
  userId: string;
  productId: mongoose.Types.ObjectId;
  rating: number;
  description: string;
  status: boolean;
}

const ReviewSchema: Schema<IReview> = new Schema({
  userId: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
  rating: { type: Number, required: true, max: 5, min: 0 },
  description: { type: String },
  status: { type: Boolean, default: true },
});

const ReviewModel = model<IReview>("Review", ReviewSchema);

export default ReviewModel;

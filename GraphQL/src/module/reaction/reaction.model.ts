import mongoose, { Document, model, Schema } from "mongoose";

export interface IReaction extends Document {
  _id?: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  product_id: mongoose.Types.ObjectId;
  type: string;
}

const ReactionSchema: Schema<IReaction> = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true },
  product_id: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
  type: { type: String, required: [true, "Reaction type is required"] },
});

const ReactionModel = model<IReaction>("Reaction", ReactionSchema);
export default ReactionModel;

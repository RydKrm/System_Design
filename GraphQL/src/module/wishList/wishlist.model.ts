import mongoose, { Document, model, Schema } from "mongoose";

export interface IWishList extends Document {
  id: mongoose.Types.ObjectId;
  user_id: number;
  product_id: mongoose.Types.ObjectId;
}

const WishListSchema: Schema<IWishList> = new Schema({
  user_id: { type: Number, required: true },
  product_id: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
});

const WishListModel = model<IWishList>("Wishlist", WishListSchema);
export default WishListModel;

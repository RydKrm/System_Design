import mongoose, { Schema, Document } from "mongoose";

// Define the Product interface
export interface IProduct extends Document {
  id: string;
  name: string;
  price: number;
  category: mongoose.Types.ObjectId;
  store: string;
  quantity: number;
  description: string;
  rating?: number;
  images: string[];
  visit?: number;
  comment?: number;
  review?: number;
  discount_price?: number;
  status?: boolean;
}

// Create the Product schema
const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: Schema.Types.ObjectId, required: true, ref: "Category" },
    description: { type: String, required: true },
    store: { type: String, required: true },
    quantity: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    images: { type: [String], required: true },
    comment: { type: Number, default: 0 },
    visit: { type: Number, default: 0 },
    review: { type: Number, default: 0 },
    discount_price: { type: Number, default: null },
    status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Create the Product model
const ProductModel = mongoose.model<IProduct>("Product", ProductSchema);

export default ProductModel;

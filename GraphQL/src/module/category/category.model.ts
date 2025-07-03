import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  _id: Schema.Types.ObjectId;
  name: string;
  description?: string;
  status?: boolean;
  parent: Schema.Types.ObjectId;
  children: Schema.Types.ObjectId[];
}

const CategorySchema: Schema<ICategory> = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: Boolean, default: true },
  parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  children: [{ type: Schema.Types.ObjectId, ref: "Category" }],
});

const CategoryModel = mongoose.model<ICategory>("Category", CategorySchema);
export default CategoryModel;

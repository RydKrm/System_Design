import mongoose, { Document, Schema, model } from "mongoose";
import { ImageCategory } from "../../utils/enum.js"; // Assuming this is an enum for parent_type values

export interface IImage extends Document {
  image_url: string;
  parent_id: mongoose.Types.ObjectId;
  parent_type: ImageCategory; // Assuming this is an enum or a string
}

const ImageSchema: Schema<IImage> = new Schema({
  image_url: { type: String, required: true },
  parent_id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  parent_type: {
    type: String,
    required: true,
    enum: Object.values(ImageCategory),
  },
});

const ImageModel = model<IImage>("Image", ImageSchema);

export default ImageModel;

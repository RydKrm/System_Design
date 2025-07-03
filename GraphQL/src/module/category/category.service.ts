import { Schema } from "mongoose";
import CategoryModel, { ICategory } from "./category.model.js";

export const buildCategoryTree = async (
  parentId: null | Schema.Types.ObjectId = null
): Promise<ICategory[] | undefined> => {
  const categories = await CategoryModel.find({ parent: parentId })
    .populate("children")
    .exec();
  if (categories.length === 0) return;
  // @ts-ignore
  return Promise.all(
    categories.map(async (category: ICategory) => {
      const data = {
        _id: category._id,
        name: category.name,
        description: category.description,
        status: category.status,
        children: await buildCategoryTree(category._id),
      };
      return data;
    })
  );
};

export const deleteTree = async (
  id: Schema.Types.ObjectId | null
): Promise<void> => {
  const categories = await CategoryModel.findById(id)
    .populate("children")
    .exec();
  if (!categories) return;
  for (const category of categories.children) {
    await deleteTree(category);
    await CategoryModel.findByIdAndDelete(category);
  }
};

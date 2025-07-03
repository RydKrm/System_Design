import { IResolvers } from "@graphql-tools/utils";
import auth from "../../auth/authHoC.js";
import {
  negativeResponse,
  positiveResponse,
} from "../../lib/response/response.js";
import CategoryModel, { ICategory } from "./category.model.js";
import { buildCategoryTree, deleteTree } from "./category.service.js";
import { Schema } from "mongoose";

interface ICreateCategory {
  name: string;
  description: string;
}

interface IUpdateCategory {
  id: string;
  name?: string;
  description?: string;
  status?: boolean;
}

const CategoryResolvers: IResolvers = {
  Query: {
    async singleCategory(_, { id }: { id: string }) {
      try {
        const category = await CategoryModel.findById(id);
        if (!category) {
          return negativeResponse("Category not found by _id");
        }
        return positiveResponse("Category found", { data: category });
      } catch (error) {
        throw new Error("Error fetching category");
      }
    },
    async allCategory() {
      try {
        const list = await buildCategoryTree();
        return positiveResponse("Category list", { data: list });
      } catch (error) {
        throw new Error("Error fetching category");
      }
    },
  },

  // Mutation start here
  Mutation: {
    createCategory: auth(
      "admin",
      async (_: any, { input }: { input: ICategory }, context: any) => {
        try {
          const name = input?.name;

          const isExists = await CategoryModel.countDocuments({ name });
          if (isExists > 0) {
            return negativeResponse("Category exists with this same name");
          }
          // first create the category
          const { description, status, parent } = input;
          const category: ICategory = new CategoryModel({
            name,
            description,
            status,
            parent,
          });
          await category.save();
          // if parent category exists then update parent category children
          if (parent) {
            const parentCategory = await CategoryModel.findById(parent);
            if (parentCategory?.children) {
              parentCategory.children.push(category?._id);
              await parentCategory.save();
            }
          }
          return positiveResponse("Category Created", { data: category });
        } catch (error) {
          throw new Error("Error Creating Category");
        }
      }
    ),

    updateCategory: auth(
      "admin",
      async (_: any, { input }: { input: IUpdateCategory }) => {
        try {
          const { id, name, description, status } = input;
          const category = await CategoryModel.findByIdAndUpdate(id, {
            name,
            description,
            status,
          });
          return positiveResponse("Category updated", { data: category });
        } catch (error) {
          throw new Error("Error on updating category");
        }
      }
    ),

    deleteCategory: auth(
      "admin",
      async (_: any, { id }: { id: Schema.Types.ObjectId }) => {
        try {
          // Find the category by id
          const category = await CategoryModel.findById(id);
          if (!category) {
            return negativeResponse("Category not found by id");
          }

          // Recursively delete the category and its subcategories
          await deleteTree(id);

          // If the category has a parent, update the parent's children array
          if (category.parent) {
            const parentCategory = await CategoryModel.findById(
              category.parent
            );

            // Filter out the deleted category from the parent's children array
            if (parentCategory) {
              parentCategory.children = parentCategory.children.filter(
                (childId) => childId != category._id
              );

              // Save the updated parent category
              await parentCategory.save();
            }
          }

          // Finally delete the root category itself
          await CategoryModel.findByIdAndDelete(id);

          // Return a positive response indicating successful deletion
          return positiveResponse(
            "Category and its subcategories have been deleted"
          );
        } catch (error) {
          console.error("Error deleting category: ", error);
          throw new Error("Error deleting category");
        }
      }
    ),
  },
};

export default CategoryResolvers;

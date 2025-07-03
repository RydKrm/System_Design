import { IResolvers } from "@graphql-tools/utils";
import ProductModel from "./product.model.js";
import authChecker from "../../auth/authChecker.js";
import auth from "../../auth/authHoC.js";
import {
  negativeResponse,
  positiveResponse,
} from "../../lib/response/response.js";

const ProductResolvers: IResolvers = {
  Query: {
    async allProduct() {
      try {
        console.log("test");
        const list = await ProductModel.find().populate("category");
        return positiveResponse("Product list", { data: list });
      } catch (error) {
        throw new Error("Error fetching products");
      }
    },
    async singleProduct(_: any, { id }: { id: string }) {
      const product = await ProductModel.findById(id);
      if (!product) {
        return negativeResponse("Product not found by _id");
      }
      return positiveResponse("Product found", { data: product });
    },
    async allProductByStore(_: any, { storeId }: { storeId: string }) {
      try {
        const products = await ProductModel.find({ store: storeId }).populate(
          "category"
        );
        return positiveResponse("Products retrieved successfully", {
          data: products,
        });
      } catch (error) {
        throw new Error("Error fetching products by store");
      }
    },
  },

  Mutation: {
    createProduct: auth(
      "manager",
      async (_: any, { input }: any, context: any) => {
        const product = new ProductModel(input);
        await product.save();
        const newProduct = await ProductModel.findById(product._id).populate(
          "category"
        );
        return positiveResponse("Product created", { data: newProduct });
      }
    ),

    async updateProduct(_, { input }: any, context: any) {
      const userRole = context.role;
      authChecker("manager", context);
      try {
        const product = await ProductModel.findByIdAndUpdate(
          input.id,
          { $set: input },
          { new: true }
        ).exec();
        if (!product) {
          return negativeResponse("Product not found by _id");
        } else {
          return positiveResponse("Product found  ", { data: product });
        }
      } catch (error) {
        throw new Error("Error updating product");
      }
    },

    async deleteProduct(_, { id }: { id: string }) {
      try {
        const result = await ProductModel.findByIdAndDelete(id).exec();
        if (!result) {
          return negativeResponse("Product not found by id");
        }
        return positiveResponse("Product deleted", { data: result });
      } catch (error) {
        throw new Error("Error deleting product");
      }
    },
    async updateStatus(_, { id }: { id: string }) {
      try {
        const product = await ProductModel.findById(id);
        if (!product) {
          return negativeResponse("Product not found by id");
        }
        product.status = !product.status;
        await product.save();
        return positiveResponse("Product status updated", { data: product });
      } catch (error) {
        console.log(error);
      }
    },
  },
};

export default ProductResolvers;

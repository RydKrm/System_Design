import { IResolvers } from "@graphql-tools/utils";
import CommentModel from "./comment.model.js";
import {
  negativeResponse,
  positiveResponse,
} from "../../lib/response/response.js";
import ProductModel from "../product/product.model.js";
interface IComment {
  id: string;
  productId: string;
  userId: string;
  commentText: string;
  commentImage: string;
}

const CommentResolvers: IResolvers = {
  Query: {
    async singleComment(_: any, { id }: { id: string }) {
      try {
        const comment = await CommentModel.findById(id);
        if (!comment) {
          return negativeResponse("Comment not found by _id");
        }
        return positiveResponse("Comment found", { data: comment });
      } catch (error) {
        throw new Error("Error fetching comment");
      }
    },
    async allComment(_: any, { id }: { id: string }) {
      try {
        const commentList = await CommentModel.find({ productId: id });
        // console.log("comment list", id, " id ", commentList);
        return positiveResponse("All comment list by product", {
          data: commentList,
        });
      } catch (error) {
        throw new Error("Error fetching all Category");
      }
    },
  },
  Mutation: {
    async createComment(_: any, { input }: any) {
      try {
        const productId = input.productId;
        const product = await ProductModel.findById(productId);
        if (!product) {
          return negativeResponse("Product not found by product id");
        }

        const comment = new CommentModel(input);
        console.log("comment test", input);
        await comment.save();

        return positiveResponse("Comment added", { data: comment });
      } catch (error) {
        throw new Error(`Error creating comment ${error}`);
      }
    },
    async updateComment(_: any, { input }: any) {
      try {
        const id = input.id;
        const comment = await CommentModel.findByIdAndUpdate(id, input);
        if (!comment) {
          return negativeResponse("Comment not found by id");
        }
        return positiveResponse("Comment updated", { data: comment });
      } catch (error) {
        throw new Error("Error creating comment");
      }
    },
    async deleteComment(_: any, { id }: { id: string }) {
      try {
        const comment = await CommentModel.findByIdAndDelete(id);
        if (!comment) {
          return negativeResponse("Comment not found by id");
        }
        return positiveResponse("Comment deleted", { data: comment });
      } catch (error) {
        throw new Error("Error Deleting comment");
      }
    },
  },
};

export default CommentResolvers;

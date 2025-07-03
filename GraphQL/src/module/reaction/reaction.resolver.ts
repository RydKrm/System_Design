import {
  negativeResponse,
  positiveResponse,
} from "../../lib/response/response.js";
import ReactionModel, { IReaction } from "./reaction.model.js";

const ReactionResolver = {
  Query: {
    async getAllReactionByProduct(_: any, { id }: any, context: any) {
      const reactionList = await ReactionModel.find({ product_id: id });
      return positiveResponse("All reaction by product", {
        data: reactionList,
      });
    },
  },
  Mutation: {
    async createReaction(_: any, { input }: any, context: any) {
      try {
        const { userId, productId, type } = input;
        const reaction = new ReactionModel({ userId, productId, type });
        await reaction.save();
        return positiveResponse("Reaction created", { data: reaction });
      } catch (error) {
        throw new Error("Error creating reaction");
      }
    },
    async updateReaction(_: any, { input }: any, context: any) {
      const { id, others } = input;
      try {
        const reaction = await ReactionModel.findByIdAndUpdate(id, others);
        if (!reaction) {
          return {
            status: false,
            message: "Reaction not found by _id",
          };
        }
        return positiveResponse("Reaction updated", { data: reaction });
      } catch (error) {
        console.log("Error updating reaction", error);
      }
    },

    //   Delete reaction from product
    async deleteReaction(_: any, { id }: any, context: any) {
      try {
        const reaction = await ReactionModel.findById(id);
        if (!reaction) {
          return negativeResponse("Reaction not found by _id");
        }
        await ReactionModel.findByIdAndDelete(id);
        return positiveResponse("Reaction deleted", { data: reaction });
      } catch (error) {
        throw new Error("Error deleting reaction");
      }
    },
  },
};

export default ReactionResolver;

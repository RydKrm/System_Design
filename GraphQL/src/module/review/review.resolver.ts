import { IResolvers } from "@graphql-tools/utils";
import auth from "../../auth/authHoC.js";
import ReviewModel from "./review.model.js";
import {
  negativeResponse,
  positiveResponse,
} from "../../lib/response/response.js";

const ReviewResolver: IResolvers = {
  Query: {
    async singleReview(_: any, { id }: any, context: any) {
      const review = await ReviewModel.findById(id);
      if (!review) {
        return negativeResponse("Review not found");
      }
      return positiveResponse("Review Found", { data: review });
    },
    async allReviewByProduct(_: any, { id }: any, context: any) {
      const reviewList = await ReviewModel.find({ productId: id });
      return positiveResponse("update status", { data: reviewList });
    },
    async allReviewByCompany(_: any, { id }: any, context: any) {
      const reviewList = await ReviewModel.find({ productId: id });
      return positiveResponse("update status", { data: reviewList });
    },
  },
  Mutation: {
    createReview: auth("user", async (_: any, { input }: any, context: any) => {
      try {
        const review = new ReviewModel(input);
        await review.save();
        console.log("review ", review);
        return positiveResponse("Review Created", { data: review });
      } catch (error) {
        console.log("Error creating review", error);
      }
    }),
    updateReview: auth("user", async (_: any, { input }: any, context: any) => {
      const { id, others } = input;
      try {
        const review = await ReviewModel.findByIdAndUpdate(id, others);
        if (!review) {
          return {
            status: false,
            message: "Review not found by _id",
          };
        }
        return positiveResponse("Review updated", { data: review });
      } catch (error) {
        console.log("Error updating review", error);
      }
    }),
    updateReviewStatus: auth(
      "user",
      async (_: any, { id }: any, context: any) => {
        const review = await ReviewModel.findById(id);
        if (!review) {
          return negativeResponse("Review not found");
        }
        return positiveResponse("update status", { data: review });
      }
    ),
    deleteReview: auth("user", async (_: any, { id }: any, context: any) => {
      const review = await ReviewModel.findByIdAndDelete(id);
      if (!review) {
        return negativeResponse("Review not found");
      }
      return positiveResponse("Review Deleted", { data: review });
    }),
  },
};

export default ReviewResolver;

import CategoryResolvers from "./module/category/category.resolver.js";
import CommentResolvers from "./module/comment/comment.resolver.js";
import ProductResolvers from "./module/product/product.resolver.js";
import ReviewResolver from "./module/review/review.resolver.js";

const resolvers = {
  Query: {
    ...ProductResolvers.Query,
    ...CategoryResolvers.Query,
    ...CommentResolvers.Query,
    ...ReviewResolver.Query,
  },
  Mutation: {
    ...ProductResolvers.Mutation,
    ...CategoryResolvers.Mutation,
    ...CommentResolvers.Mutation,
    ...ReviewResolver.Mutation,
  },
};

export default resolvers;

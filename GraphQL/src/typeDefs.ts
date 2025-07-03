import { readFileSync } from "fs";
import path from "path";
const typeDefs = [
  readFileSync(path.resolve("./src/module/product/product.schema.graphql"), {
    encoding: "utf-8",
  }),
  readFileSync(path.resolve("./src/module/category/category.schema.graphql"), {
    encoding: "utf-8",
  }),
  readFileSync(path.resolve("./src/module/comment/comment.schema.graphql"), {
    encoding: "utf-8",
  }),
  readFileSync(path.resolve("./src/module/review/review.schema.graphql"), {
    encoding: "utf-8",
  }),
];

export default typeDefs;

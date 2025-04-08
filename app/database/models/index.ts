import { User, Role, Token } from "./user";
import { Idea } from "./ideas";

export const modelsUp = async () => {
  console.info("Running model up functions.");
  await User.up();
  await Role.up();
  await Token.up();
  await Idea.up();
};

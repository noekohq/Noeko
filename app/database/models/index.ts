import { User, Role, Token } from "./user";
import { Idea } from "./ideas";
import { UserFile } from "./userfile";

export const modelsUp = async () => {
  console.info("Running model up functions.");
  await User.up();
  await Role.up();
  await Token.up();
  await Idea.up();
  await UserFile.up();
};

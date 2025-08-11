import { User, Role, Token } from "./user";
import { Idea } from "./ideas";
import { UserFile } from "./userfile";
import { Import } from "./import";
import { Tag } from "./tag";
import { Log } from "./log";
import { SpyglassSearch } from "./search";
import { WebSearch } from "./search/web_search";
import Rabbithole from "./rabbithole";
import Task from "./task";

export const modelsUp = async () => {
  try {
    console.info("Running model up functions.");
    await User.up();
    await Role.up();
    await Token.up();
    await Idea.up();
    await UserFile.up();
    await Import.up();
    await Tag.up();
    await Log.up();
    await SpyglassSearch.up();
    await Rabbithole.up();
    await Task.up();
    await WebSearch.up();
  } catch (error) {
    console.error("There was an error updating models: ", error);
  }
};

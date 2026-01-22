import {
  IExcerptable,
  IExcerptReference,
} from "../../../../shared/types/excerpt";
import { ISource } from "../../../../app/database/models/source";
import SourceButton from "../Sources/SourceButton";

interface IExcerptableThing {
  thing: IExcerptReference;
}

export default function ExcerptableThing({ thing }: IExcerptableThing) {
  if (thing.id.toString().startsWith("source")) {
    const source = thing as ISource;
    return <SourceButton source={source} />;
  }
}

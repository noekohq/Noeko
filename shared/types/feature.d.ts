import { RecordId } from "surrealdb";

export type IFeature = {
  id: string | RecordId;
  name: string;
};

export type IFeatureForm = Omit<IFeature, "id">;

export interface IUserViewRelation {
  id: string | RecordId;
  in: string | RecordId;
  out: string | RecordId;
  createdAt: Date;
}

import { initial } from "lodash";
import Feature, { IFeatureForm } from "../models/feature";

const initialFeatures: IFeatureForm[] = [
  // DASHBOARD STUFF
  { name: "widget_task_list" },
  {
    name: "widget_recent_constellation",
  },
  {
    name: "widget_serendipity",
  },
  {
    name: "widget_glance",
  },
  // EDITOR STUFF
  {
    name: "tags",
  },
  {
    name: "connections",
  },
  {
    name: "context",
  },
  {
    name: "smart_search",
  },
  // ACTIONS
  {
    name: "button_create",
  },
  {
    name: "button_profile",
  },
  // NAVIGATION
  {
    name: "navigation_spyglass",
  },
  {
    name: "constellation_navigation",
  },
  {
    name: "rabbithole_navigation",
  },
  {
    name: "spyglass_navigation",
  },
  // WORKFLOWS
  {
    name: "import",
  },
];

export const seedFeatures = async () => {
  console.info(`Seeding ${initialFeatures.length} features.`);
  for (const feature of initialFeatures) {
    await Feature.upsert(feature);
  }
};

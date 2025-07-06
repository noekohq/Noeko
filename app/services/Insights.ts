export default class Insights {
  constructor() {}

  public static async up() {}

  public static async down() {}
}

export const initInsights = async () => {
  console.info("Initializing insights");
  await Insights.up();
};

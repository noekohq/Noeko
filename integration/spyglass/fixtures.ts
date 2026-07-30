export const SPYGLASS_LIVE_QUERY =
  "Synthesize my Lumen learning cycle: how should I run it each week, measure whether it works, and avoid its known failure modes?";

export const SPYGLASS_SEMANTIC_QUERY =
  "a weekly deliberate-practice system using tiny experiments, evidence, and end-of-week reflection";

export type SpyglassSeedNote = {
  key: string;
  title: string;
  content: string;
  relevant: boolean;
};

export const SPYGLASS_SEED_NOTES: SpyglassSeedNote[] = [
  {
    key: "foundation",
    title: "Lumen cycle — operating rhythm",
    relevant: true,
    content: `
      <h2>Weekly operating rhythm</h2>
      <p>The Lumen learning cycle turns deliberate practice into a weekly loop.</p>
      <p>On Monday, choose one observable skill and write a baseline prediction.
      On Tuesday and Wednesday, run two small experiments that each change only one variable.
      On Thursday, compare the evidence with the prediction.
      On Friday, write a short reflection and choose the next experiment.</p>
      <p>A cycle is complete only when the Friday reflection names what changed,
      what evidence supports that conclusion, and what should happen next.</p>
    `,
  },
  {
    key: "measurement",
    title: "Lumen cycle — evidence and measures",
    relevant: true,
    content: `
      <h2>Evidence rules</h2>
      <p>Use one leading measure and one outcome measure for each Lumen cycle.</p>
      <p>The leading measure is the number of focused practice attempts completed.
      The outcome measure is a before-and-after performance sample scored with the same rubric.</p>
      <p>Keep a decision log that records the prediction, the observed result, and the decision
      to continue, change, or stop the experiment. Do not treat effort or confidence as proof of improvement.</p>
    `,
  },
  {
    key: "failure-modes",
    title: "Lumen cycle — failure modes",
    relevant: true,
    content: `
      <h2>Known failure modes</h2>
      <p>The loop stalls when the weekly target is too broad, when several variables change at once,
      or when the Friday reflection is skipped.</p>
      <p>A second failure mode is measurement drift: changing the rubric after seeing the result
      makes the before-and-after samples incomparable.</p>
      <p>If two cycles produce no measurable movement, shrink the skill target before adding more practice time.</p>
    `,
  },
  {
    key: "facilitation",
    title: "Facilitating a Lumen review",
    relevant: true,
    content: `
      <h2>Friday review prompts</h2>
      <p>Ask: What did we predict? What actually happened? Which observation is strongest?
      What single change will we test next?</p>
      <p>Keep the review under twenty minutes. End by assigning an owner and a date to the next experiment.</p>
    `,
  },
  {
    key: "distractor-finance",
    title: "Quarterly finance review checklist",
    relevant: false,
    content: `
      <p>Reconcile invoices, review department forecasts, and confirm the quarterly budget variance.
      Escalate purchase orders that do not have an assigned cost center.</p>
    `,
  },
  {
    key: "distractor-garden",
    title: "Garden irrigation observations",
    relevant: false,
    content: `
      <p>Water the north garden before sunrise. Compare soil moisture near the tomatoes and beans,
      then adjust the drip timer during hot weather.</p>
    `,
  },
];

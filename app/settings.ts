const { MAX_LM_PROMPT_SIZE, MAX_USER_NOTES, MAX_SPYGLASS_FINDING_AMOUNT } =
  process.env;

export const max_lm_prompt_size = Number(MAX_LM_PROMPT_SIZE) ?? 100000;
export const max_user_notes = Number(MAX_USER_NOTES) ?? 500;

export const max_spyglass_finding_amount =
  Number(MAX_SPYGLASS_FINDING_AMOUNT) ?? 500;

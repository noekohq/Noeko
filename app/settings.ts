const {
  MAX_LM_PROMPT_SIZE,
  MAX_USER_NOTES,
  MAX_SPYGLASS_FINDING_AMOUNT,
  MAX_EMBEDDABLE_CHARACTERS,
} = process.env;

export const default_embeddings_dimension = 768;

export const max_lm_prompt_size = Number(MAX_LM_PROMPT_SIZE) ?? 100000;
export const max_embeddable_characters =
  Number(MAX_EMBEDDABLE_CHARACTERS) ?? 20000;
export const max_user_notes = Number(MAX_USER_NOTES) ?? 500;

export const max_spyglass_finding_amount =
  Number(MAX_SPYGLASS_FINDING_AMOUNT) ?? 500;

// # GOOGLE SPECIFIC
export const default_google_embeddings_model = "text-embedding-005";

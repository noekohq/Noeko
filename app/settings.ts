const { MAX_LM_PROMPT_SIZE } = process.env;

export const max_lm_prompt_size = MAX_LM_PROMPT_SIZE ?? 100000;

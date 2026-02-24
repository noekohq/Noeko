import { htmlToPlainText } from "@core/utils/formatting";

export const validateEmail = (value: string) => {
  if (!value) return false;
  return /^\S+@\S+$/.test(value);
};

export const validateIdeaContent = (value: string): { isValid: boolean; errors: string[] } => {
  const errorsFound: string[] = [];
  const words = htmlToPlainText(value).split(" ");
  if (words.length > 15000) {
    errorsFound.push("Content is too long. Maximum allowed words is 15,000.");
  }
  return { isValid: errorsFound.length === 0, errors: errorsFound };
};

import { IProcessedText } from "../types/ideas";

export const getWordCount = (text: string) => {
  return text.split(" ").length;
};

export const getCharCount = (text: string, omitSpaces?: boolean) => {
  if (omitSpaces) {
    return text.split("").filter((l) => " ").length;
  }
  return text.split("").length;
};

export const getSentenceCount = (text: string) => {
  return text.split(".").length;
};

export const getTextProcessed = (text: string): IProcessedText => {
  return {
    wordCount: getWordCount(text),
    characterCount: getCharCount(text),
    characterCountWithoutSpaces: getCharCount(text, true),
    sentenceCount: getSentenceCount(text),
  } satisfies IProcessedText;
};

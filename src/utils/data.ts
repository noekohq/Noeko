export const validateEmail = (value: string) => {
  if (!value) return false;
  return /^\S+@\S+$/.test(value);
};

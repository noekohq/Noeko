const { VITE_DEPLOYED_URL } = import.meta.env;

export function getReferralLinkFromCode(code: string) {
  return `${VITE_DEPLOYED_URL}/register?ref=${code}`;
}

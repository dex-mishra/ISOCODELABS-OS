/**
 * Validates the format of a Fathom recording link.
 * Expected format: https://fathom.video/share/* or fathom.video/share/*
 */
export function isValidFathomUrl(url: string): boolean {
  if (!url) return false;
  const cleaned = url.trim().toLowerCase();
  
  // Accept with or without http/https protocol
  const regex = /^(https?:\/\/)?(www\.)?fathom\.video\/share\/.+$/;
  return regex.test(cleaned);
}

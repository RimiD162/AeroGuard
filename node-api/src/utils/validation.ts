export function validateIndianTailNumber(tailNumber: string): boolean {
  if (!tailNumber) return false;

  // 1. Enforce uppercase and trim whitespace
  const cleanTail = tailNumber.trim().toUpperCase();

  // 2. Structural Check: Must match VT-XXX exactly
  const structuralRegex = /^VT-[A-Z]{3}$/;
  if (!structuralRegex.test(cleanTail)) {
    return false;
  }

  // 3. Extract the 3-letter suffix
  const suffix = cleanTail.split('-')[1];

  // 4. Critical Blacklist Check (Distress & Safety Codes)
  const forbiddenSuffixes = ['SOS', 'PAN', 'ASS', 'XXX', 'GOV', 'MIL'];
  if (forbiddenSuffixes.includes(suffix)) {
    return false;
  }

  // 5. Aviation Q-Code Check: Suffix cannot start with 'Q'
  if (suffix.startsWith('Q')) {
    return false;
  }

  return true;
}

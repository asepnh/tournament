/** 0-indexed number to spreadsheet-style letters: 0 -> A, 25 -> Z, 26 -> AA, ... */
export function indexToLetters(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

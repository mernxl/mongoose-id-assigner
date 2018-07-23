/**
 * Increments a given id from max_id
 *
 * @param {string} max_id
 * @param {string} separator
 * @return {string}
 */
export function stringIncrementer(max_id: string, separator = '-'): string {
  const maxLength = max_id.length;

  let firstDash = -1; // consider firstDash maxLength Position
  let lastSig = maxLength + 1; // Position of last significant figure

  for (let i = maxLength - 1; i >= 0; i--) {
    if (max_id[i] === separator) {
      firstDash = i;
      if (maxLength - 1 === i) {
        lastSig = maxLength + 1; // case 99909-
      }
      break;
    } else if (/[1-9]/.test(max_id[i])) {
      lastSig = i;
    } else if (max_id[i] === '0' && maxLength - 1 === i) {
      lastSig = maxLength; // case 99909-0
    }
  }

  let digits = max_id.substr(firstDash + 1) as any;

  if (isNaN(digits++)) {
    // increment
    throw Error(`Error Wrong Max_id format, must end with number from separator: (${separator})
    e.g 9434034, 4dc34-34, IBSN${separator}093JDS${separator}number. Could not increment from Max_id: ${max_id}`);
  }

  // Get next Significant figure (10 if count = 1)
  const nextSig = Math.pow(10, maxLength - lastSig);

  // if has moved up one digit(significant figure) and if lashDash will be cut out at location ltCount -1
  if (digits >= nextSig) {
    return `${max_id.substr(0, lastSig - 1)}${digits}`;
  }

  return `${max_id.substr(0, lastSig)}${digits}`;
}

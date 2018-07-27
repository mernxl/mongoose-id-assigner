import { throwPluginError } from '../../others';

/**
 * Increments a given id from nextId
 *
 * @param {string} nextId
 * @param {string} separator
 * @return {string}
 */
export function stringIncrementer(nextId: string, separator = '-'): string {
  const maxLength = nextId.length;

  let firstDash = -1; // consider firstDash maxLength Position
  let lastSig = maxLength + 1; // Position of last significant figure

  for (let i = maxLength - 1; i >= 0; i--) {
    if (nextId[i] === separator) {
      firstDash = i;
      if (maxLength - 1 === i) {
        lastSig = maxLength + 1; // case 99909-
      }
      break;
    } else if (/[1-9]/.test(nextId[i])) {
      lastSig = i;
    } else if (nextId[i] === '0' && maxLength - 1 === i) {
      lastSig = maxLength; // case 99909-0
    }
  }

  let digits = nextId.substr(firstDash + 1) as any;

  if (isNaN(digits++)) {
    throwPluginError(
      `Wrong nextId format, must end with number from separator. ` +
        `e.g separator: - nextIds => 9434034, 4dc34-34, IBSN-093JDS-number. ` +
        `Could not increment from nextId: ${nextId}, separator: : (${separator})`,
    );
  }

  // Get next Significant figure (10 if count = 1)
  const nextSig = Math.pow(10, maxLength - lastSig);

  // if has moved up one digit(significant figure) and if lashDash will be cut out at location ltCount -1
  if (digits >= nextSig) {
    return `${nextId.substr(0, lastSig - 1)}${digits}`;
  }

  return `${nextId.substr(0, lastSig)}${digits}`;
}

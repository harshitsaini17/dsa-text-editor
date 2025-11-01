import { Operation } from './types';

/**
 * Transform operation against another operation
 * Returns the transformed version that can be applied after the other op
 */
export function transform(op1: Operation, op2: Operation): Operation {
  // Insert vs Insert
  if (op1.type === 'insert' && op2.type === 'insert') {
    if (op1.pos < op2.pos) {
      return op1;
    } else if (op1.pos > op2.pos) {
      return { ...op1, pos: op1.pos + (op2.text?.length || 0) };
    } else {
      // Same position - tie-break by clientId
      if (op1.clientId < op2.clientId) {
        return op1;
      } else {
        return { ...op1, pos: op1.pos + (op2.text?.length || 0) };
      }
    }
  }

  // Insert vs Delete
  if (op1.type === 'insert' && op2.type === 'delete') {
    const delEnd = op2.pos + (op2.len || 0);
    if (op1.pos <= op2.pos) {
      return op1;
    } else if (op1.pos >= delEnd) {
      return { ...op1, pos: op1.pos - (op2.len || 0) };
    } else {
      return { ...op1, pos: op2.pos };
    }
  }

  // Delete vs Insert
  if (op1.type === 'delete' && op2.type === 'insert') {
    if (op1.pos < op2.pos) {
      const delEnd = op1.pos + (op1.len || 0);
      if (delEnd <= op2.pos) {
        return op1;
      } else {
        return { ...op1, len: (op1.len || 0) + (op2.text?.length || 0) };
      }
    } else {
      return { ...op1, pos: op1.pos + (op2.text?.length || 0) };
    }
  }

  // Delete vs Delete
  if (op1.type === 'delete' && op2.type === 'delete') {
    const del1End = op1.pos + (op1.len || 0);
    const del2End = op2.pos + (op2.len || 0);

    if (del1End <= op2.pos) {
      return op1;
    } else if (op1.pos >= del2End) {
      return { ...op1, pos: op1.pos - (op2.len || 0) };
    } else {
      // Overlapping deletes
      const newPos = Math.min(op1.pos, op2.pos);
      const newEnd = Math.max(del1End, del2End) - (op2.len || 0);
      const newLen = Math.max(0, newEnd - newPos);
      return { ...op1, pos: newPos, len: newLen };
    }
  }

  return op1;
}

/**
 * Rebase a local operation against a list of server operations
 */
export function rebaseOperation(localOp: Operation, serverOps: Operation[]): Operation {
  let transformed = localOp;
  for (const serverOp of serverOps) {
    transformed = transform(transformed, serverOp);
  }
  return transformed;
}

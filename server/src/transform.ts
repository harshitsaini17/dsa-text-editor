import { Operation, InsertOperation, DeleteOperation } from './types';

/**
 * Operational Transform (OT) implementation
 * Transforms operations to resolve conflicts in concurrent editing
 */

/**
 * Transforms operation A against operation B
 * Returns A' such that applying B then A' produces the same result as applying A then B'
 * 
 * @param opA - Operation to transform
 * @param opB - Operation to transform against
 * @returns Transformed operation A'
 */
export function transform(opA: Operation, opB: Operation): Operation {
  // Insert vs Insert
  if (opA.type === 'insert' && opB.type === 'insert') {
    return transformInsertInsert(opA as InsertOperation, opB as InsertOperation);
  }
  
  // Insert vs Delete
  if (opA.type === 'insert' && opB.type === 'delete') {
    return transformInsertDelete(opA as InsertOperation, opB as DeleteOperation);
  }
  
  // Delete vs Insert
  if (opA.type === 'delete' && opB.type === 'insert') {
    return transformDeleteInsert(opA as DeleteOperation, opB as InsertOperation);
  }
  
  // Delete vs Delete
  if (opA.type === 'delete' && opB.type === 'delete') {
    return transformDeleteDelete(opA as DeleteOperation, opB as DeleteOperation);
  }
  
  throw new Error('Invalid operation types');
}

/**
 * Transforms Insert vs Insert
 * When both operations insert at the same position, use clientId for tie-breaking
 */
function transformInsertInsert(opA: InsertOperation, opB: InsertOperation): InsertOperation {
  if (opB.pos < opA.pos) {
    // B inserts before A, shift A right
    return {
      ...opA,
      pos: opA.pos + opB.text.length,
    };
  } else if (opB.pos > opA.pos) {
    // B inserts after A, no change needed
    return opA;
  } else {
    // Same position - tie-break by clientId (lexicographic order)
    if (opB.clientId < opA.clientId) {
      // B wins, shift A right
      return {
        ...opA,
        pos: opA.pos + opB.text.length,
      };
    } else {
      // A wins, no change
      return opA;
    }
  }
}

/**
 * Transforms Insert vs Delete
 */
function transformInsertDelete(opA: InsertOperation, opB: DeleteOperation): InsertOperation {
  const deleteEnd = opB.pos + opB.len;
  
  if (opA.pos <= opB.pos) {
    // A inserts before or at delete start, no change
    return opA;
  } else if (opA.pos >= deleteEnd) {
    // A inserts after delete end, shift left
    return {
      ...opA,
      pos: opA.pos - opB.len,
    };
  } else {
    // A inserts inside deleted range, move to delete start
    return {
      ...opA,
      pos: opB.pos,
    };
  }
}

/**
 * Transforms Delete vs Insert
 */
function transformDeleteInsert(opA: DeleteOperation, opB: InsertOperation): DeleteOperation {
  const deleteEnd = opA.pos + opA.len;
  
  if (opB.pos <= opA.pos) {
    // B inserts before delete, shift delete right
    return {
      ...opA,
      pos: opA.pos + opB.text.length,
    };
  } else if (opB.pos >= deleteEnd) {
    // B inserts after delete, no change
    return opA;
  } else {
    // B inserts inside delete range, extend delete length
    return {
      ...opA,
      len: opA.len + opB.text.length,
    };
  }
}

/**
 * Transforms Delete vs Delete
 * Handles overlapping deletes
 */
function transformDeleteDelete(opA: DeleteOperation, opB: DeleteOperation): DeleteOperation {
  const aEnd = opA.pos + opA.len;
  const bEnd = opB.pos + opB.len;
  
  // Case 1: B is entirely before A
  if (bEnd <= opA.pos) {
    return {
      ...opA,
      pos: opA.pos - opB.len,
    };
  }
  
  // Case 2: B is entirely after A
  if (opB.pos >= aEnd) {
    return opA;
  }
  
  // Case 3: B contains A entirely
  if (opB.pos <= opA.pos && bEnd >= aEnd) {
    return {
      ...opA,
      pos: opB.pos,
      len: 0,
    };
  }
  
  // Case 4: A contains B entirely
  if (opA.pos <= opB.pos && aEnd >= bEnd) {
    return {
      ...opA,
      len: opA.len - opB.len,
    };
  }
  
  // Case 5: B overlaps A from the left
  if (opB.pos < opA.pos && bEnd > opA.pos && bEnd < aEnd) {
    return {
      ...opA,
      pos: opB.pos,
      len: aEnd - bEnd,
    };
  }
  
  // Case 6: B overlaps A from the right
  if (opB.pos > opA.pos && opB.pos < aEnd && bEnd >= aEnd) {
    return {
      ...opA,
      len: opB.pos - opA.pos,
    };
  }
  
  // Default: no overlap (shouldn't reach here)
  return opA;
}

/**
 * Transforms an operation against a sequence of operations
 * @param op - Operation to transform
 * @param ops - Array of operations to transform against
 * @returns Transformed operation
 */
export function transformAgainstOps(op: Operation, ops: Operation[]): Operation {
  let transformed = op;
  for (const otherOp of ops) {
    transformed = transform(transformed, otherOp);
  }
  return transformed;
}

import { FenwickTree } from './fenwick';
import { Operation } from './types';

/**
 * Transform Engine - Uses Fenwick Tree for efficient position transformation
 */
export class TransformEngine {
  /**
   * Builds a shift index (Fenwick Tree) from operations since a given sequence number
   * @param ops - Array of operations
   * @param _sinceSeq - Sequence number to start from (reserved for future use)
   * @returns Fenwick Tree representing cumulative shifts
   */
  buildShiftIndex(ops: Operation[], _sinceSeq: number): FenwickTree {
    // Find max position to determine tree size
    let maxPos = 10000; // Default size
    for (const op of ops) {
      if (op.pos > maxPos) {
        maxPos = op.pos + 1000;
      }
    }

    const fenwick = new FenwickTree(maxPos);

    // Apply all operations since sinceSeq
    for (const op of ops) {
      if (op.type === 'insert' && op.text) {
        fenwick.addInsert(op.pos, op.text.length);
      } else if (op.type === 'delete' && op.len) {
        fenwick.addDelete(op.pos, op.len);
      }
    }

    return fenwick;
  }

  /**
   * Rebases an operation using the shift index (Fenwick Tree)
   * @param op - Operation to rebase
   * @param fenwick - Fenwick Tree with accumulated shifts
   * @returns Rebased operation
   */
  rebaseOp(op: Operation, fenwick: FenwickTree): Operation {
    if (op.pos === 0) {
      return op;
    }

    // Query the shift at this position
    const shift = fenwick.query(op.pos - 1);

    return {
      ...op,
      pos: Math.max(0, op.pos + shift),
    };
  }

  /**
   * Transforms an operation against a tail of operations
   * @param op - Operation to transform
   * @param tailOps - Operations to transform against
   * @returns Transformed operation
   */
  transformAgainstTail(op: Operation, tailOps: Operation[]): Operation {
    if (tailOps.length === 0) {
      return op;
    }

    // Build shift index from tail operations
    const fenwick = this.buildShiftIndex(tailOps, 0);
    
    // Rebase the operation
    return this.rebaseOp(op, fenwick);
  }
}

/**
 * Fenwick Tree (Binary Indexed Tree) implementation
 * Used for efficient prefix sum queries and range updates
 * Supports O(log n) update and query operations
 */
export class FenwickTree {
  private tree: number[];
  private size: number;

  /**
   * Creates a Fenwick Tree
   * @param size - Size of the array
   */
  constructor(size: number) {
    this.size = size;
    this.tree = new Array(size + 1).fill(0);
  }

  /**
   * Updates the value at index by delta
   * @param idx - Index to update (0-indexed)
   * @param delta - Value to add
   * Time Complexity: O(log n)
   */
  update(idx: number, delta: number): void {
    if (idx < 0 || idx >= this.size) {
      throw new Error('Index out of bounds');
    }

    // Convert to 1-indexed
    idx = idx + 1;

    // Update all affected nodes
    while (idx <= this.size) {
      this.tree[idx] += delta;
      idx += idx & (-idx); // Add last set bit
    }
  }

  /**
   * Computes prefix sum from index 0 to idx (inclusive)
   * @param idx - Index up to which to compute sum (0-indexed)
   * @returns Prefix sum
   * Time Complexity: O(log n)
   */
  query(idx: number): number {
    if (idx < 0) {
      return 0;
    }
    if (idx >= this.size) {
      idx = this.size - 1;
    }

    // Convert to 1-indexed
    idx = idx + 1;

    let sum = 0;
    while (idx > 0) {
      sum += this.tree[idx];
      idx -= idx & (-idx); // Remove last set bit
    }

    return sum;
  }

  /**
   * Computes range sum from left to right (inclusive)
   * @param left - Left index (0-indexed)
   * @param right - Right index (0-indexed)
   * @returns Sum of elements in range [left, right]
   */
  rangeQuery(left: number, right: number): number {
    if (left > right) {
      throw new Error('Invalid range');
    }
    if (left === 0) {
      return this.query(right);
    }
    return this.query(right) - this.query(left - 1);
  }

  /**
   * Adds an insert operation at the given position
   * All positions >= pos are shifted right by len
   * @param pos - Position of insert (0-indexed)
   * @param len - Length of inserted text
   */
  addInsert(pos: number, len: number): void {
    if (len <= 0) {
      return;
    }
    // Update all positions >= pos
    this.update(pos, len);
  }

  /**
   * Adds a delete operation at the given position
   * All positions > pos are shifted left by len
   * @param pos - Position of delete (0-indexed)
   * @param len - Length of deleted text
   */
  addDelete(pos: number, len: number): void {
    if (len <= 0) {
      return;
    }
    // Update all positions > pos (shift left)
    this.update(pos, -len);
  }

  /**
   * Gets the size of the tree
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Resets all values in the tree to 0
   */
  reset(): void {
    this.tree.fill(0);
  }
}

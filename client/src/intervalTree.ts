/**
 * Interval Tree implementation for cursor and selection tracking
 * Uses Red-Black tree balancing for O(log n) operations
 */

export interface Interval {
  start: number;
  end: number;
  data: {
    clientId: string;
    color: string;
  };
}

type NodeColor = 'RED' | 'BLACK';

/**
 * IntervalNode represents a node in the Interval Tree
 */
export class IntervalNode {
  interval: Interval;
  max: number;  // Maximum endpoint in this subtree
  color: NodeColor;
  left?: IntervalNode;
  right?: IntervalNode;
  parent?: IntervalNode;

  constructor(interval: Interval) {
    this.interval = interval;
    this.max = interval.end;
    this.color = 'RED';  // New nodes are always red
  }
}

/**
 * IntervalTree - Augmented BST for managing overlapping intervals
 */
export class IntervalTree {
  root?: IntervalNode;

  /**
   * Inserts a new interval into the tree
   * @param start - Start position of interval
   * @param end - End position of interval
   * @param data - Data associated with interval (clientId, color)
   */
  insert(start: number, end: number, data: { clientId: string; color: string }): void {
    const interval: Interval = { start, end, data };
    const newNode = new IntervalNode(interval);

    if (!this.root) {
      this.root = newNode;
      this.root.color = 'BLACK';
      return;
    }

    this.insertNode(this.root, newNode);
    this.fixInsert(newNode);
  }

  /**
   * Helper function to insert a node
   */
  private insertNode(root: IntervalNode, node: IntervalNode): void {
    // Update max values along the path
    if (node.max > root.max) {
      root.max = node.max;
    }

    if (node.interval.start < root.interval.start) {
      if (!root.left) {
        root.left = node;
        node.parent = root;
      } else {
        this.insertNode(root.left, node);
      }
    } else {
      if (!root.right) {
        root.right = node;
        node.parent = root;
      } else {
        this.insertNode(root.right, node);
      }
    }
  }

  /**
   * Fixes Red-Black tree properties after insertion
   */
  private fixInsert(node: IntervalNode): void {
    while (node.parent && node.parent.color === 'RED') {
      const parent = node.parent;
      const grandparent = parent.parent;

      if (!grandparent) break;

      if (parent === grandparent.left) {
        const uncle = grandparent.right;

        if (uncle && uncle.color === 'RED') {
          // Case 1: Uncle is red
          parent.color = 'BLACK';
          uncle.color = 'BLACK';
          grandparent.color = 'RED';
          node = grandparent;
        } else {
          if (node === parent.right) {
            // Case 2: Node is right child
            node = parent;
            this.rotateLeft(node);
          }
          // Case 3: Node is left child
          parent.color = 'BLACK';
          grandparent.color = 'RED';
          this.rotateRight(grandparent);
        }
      } else {
        const uncle = grandparent.left;

        if (uncle && uncle.color === 'RED') {
          // Case 1: Uncle is red
          parent.color = 'BLACK';
          uncle.color = 'BLACK';
          grandparent.color = 'RED';
          node = grandparent;
        } else {
          if (node === parent.left) {
            // Case 2: Node is left child
            node = parent;
            this.rotateRight(node);
          }
          // Case 3: Node is right child
          parent.color = 'BLACK';
          grandparent.color = 'RED';
          this.rotateLeft(grandparent);
        }
      }
    }

    if (this.root) {
      this.root.color = 'BLACK';
    }
  }

  /**
   * Left rotation
   */
  private rotateLeft(node: IntervalNode): void {
    const rightChild = node.right;
    if (!rightChild) return;

    node.right = rightChild.left;
    if (rightChild.left) {
      rightChild.left.parent = node;
    }

    rightChild.parent = node.parent;

    if (!node.parent) {
      this.root = rightChild;
    } else if (node === node.parent.left) {
      node.parent.left = rightChild;
    } else {
      node.parent.right = rightChild;
    }

    rightChild.left = node;
    node.parent = rightChild;

    // Update max values
    this.updateMax(node);
    this.updateMax(rightChild);
  }

  /**
   * Right rotation
   */
  private rotateRight(node: IntervalNode): void {
    const leftChild = node.left;
    if (!leftChild) return;

    node.left = leftChild.right;
    if (leftChild.right) {
      leftChild.right.parent = node;
    }

    leftChild.parent = node.parent;

    if (!node.parent) {
      this.root = leftChild;
    } else if (node === node.parent.right) {
      node.parent.right = leftChild;
    } else {
      node.parent.left = leftChild;
    }

    leftChild.right = node;
    node.parent = leftChild;

    // Update max values
    this.updateMax(node);
    this.updateMax(leftChild);
  }

  /**
   * Updates the max value of a node based on its children
   */
  private updateMax(node: IntervalNode): void {
    node.max = node.interval.end;
    if (node.left && node.left.max > node.max) {
      node.max = node.left.max;
    }
    if (node.right && node.right.max > node.max) {
      node.max = node.right.max;
    }
  }

  /**
   * Finds all intervals that overlap with the given range
   * @param start - Start of query range
   * @param end - End of query range
   * @returns Array of overlapping intervals
   */
  findOverlapping(start: number, end: number): Interval[] {
    const result: Interval[] = [];
    this.findOverlappingHelper(this.root, start, end, result);
    return result;
  }

  /**
   * Helper function for finding overlapping intervals
   */
  private findOverlappingHelper(
    node: IntervalNode | undefined,
    start: number,
    end: number,
    result: Interval[]
  ): void {
    if (!node) return;

    // Check if current interval overlaps
    if (node.interval.start < end && node.interval.end > start) {
      result.push(node.interval);
    }

    // Recursively search left subtree if it might contain overlapping intervals
    if (node.left && node.left.max > start) {
      this.findOverlappingHelper(node.left, start, end, result);
    }

    // Recursively search right subtree
    if (node.right && node.interval.start < end) {
      this.findOverlappingHelper(node.right, start, end, result);
    }
  }

  /**
   * Deletes an interval by clientId
   * @param clientId - Client ID to delete
   */
  delete(clientId: string): void {
    const node = this.findByClientId(this.root, clientId);
    if (node) {
      this.deleteNode(node);
    }
  }

  /**
   * Finds a node by clientId
   */
  private findByClientId(node: IntervalNode | undefined, clientId: string): IntervalNode | undefined {
    if (!node) return undefined;

    if (node.interval.data.clientId === clientId) {
      return node;
    }

    const left = this.findByClientId(node.left, clientId);
    if (left) return left;

    return this.findByClientId(node.right, clientId);
  }

  /**
   * Deletes a node from the tree
   * Note: Full RB-tree deletion is complex, this is a simplified version
   */
  private deleteNode(_node: IntervalNode): void {
    // Simplified deletion - full implementation would require RB-tree fix-up
    // For MVP, we'll mark as deleted or implement simple BST deletion
    // TODO: Implement full RB-tree deletion with fix-up
  }

  /**
   * Shifts all intervals at or after the given position by delta
   * @param pos - Position from which to shift
   * @param delta - Amount to shift (positive for insert, negative for delete)
   */
  shiftAll(pos: number, delta: number): void {
    this.shiftAllHelper(this.root, pos, delta);
  }

  /**
   * Helper function to shift intervals
   */
  private shiftAllHelper(node: IntervalNode | undefined, pos: number, delta: number): void {
    if (!node) return;

    // Shift current interval if it's at or after pos
    if (node.interval.start >= pos) {
      node.interval.start += delta;
      node.interval.end += delta;
      node.max += delta;
    } else if (node.interval.end > pos) {
      // Interval spans the position
      node.interval.end += delta;
      node.max += delta;
    }

    // Recursively shift children
    this.shiftAllHelper(node.left, pos, delta);
    this.shiftAllHelper(node.right, pos, delta);

    // Update max after shifting children
    this.updateMax(node);
  }

  /**
   * Gets all intervals in the tree
   * @returns Array of all intervals
   */
  getAll(): Interval[] {
    const result: Interval[] = [];
    this.getAllHelper(this.root, result);
    return result;
  }

  /**
   * Helper function to get all intervals
   */
  private getAllHelper(node: IntervalNode | undefined, result: Interval[]): void {
    if (!node) return;

    this.getAllHelper(node.left, result);
    result.push(node.interval);
    this.getAllHelper(node.right, result);
  }
}

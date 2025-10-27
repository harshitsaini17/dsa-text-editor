/**
 * RopeNode represents a node in the Rope data structure
 * A Rope is a balanced binary tree for efficient string operations
 */
export class RopeNode {
  text?: string;         // Only for leaf nodes
  weight: number;        // Number of characters in left subtree (for internal nodes) or text length (for leaf nodes)
  left?: RopeNode;       // Left child
  right?: RopeNode;      // Right child
  height: number;        // Height for AVL balancing

  constructor(text?: string) {
    this.text = text;
    this.weight = text ? text.length : 0;
    this.height = 1;
  }

  /**
   * Returns true if this is a leaf node
   */
  isLeaf(): boolean {
    return this.text !== undefined;
  }

  /**
   * Gets the total length of text in this subtree
   */
  length(): number {
    if (this.isLeaf()) {
      return this.text!.length;
    }
    return this.weight + (this.right ? this.right.length() : 0);
  }

  /**
   * Returns the entire text as a string
   */
  toString(): string {
    if (this.isLeaf()) {
      return this.text!;
    }
    const leftStr = this.left ? this.left.toString() : '';
    const rightStr = this.right ? this.right.toString() : '';
    return leftStr + rightStr;
  }

  /**
   * Gets the character at the specified index
   * @param index - Position in the text (0-indexed)
   * @returns The character at the index
   */
  charAt(index: number): string {
    if (index < 0 || index >= this.length()) {
      throw new Error('Index out of bounds');
    }

    if (this.isLeaf()) {
      return this.text![index];
    }

    if (index < this.weight) {
      return this.left!.charAt(index);
    } else {
      return this.right!.charAt(index - this.weight);
    }
  }

  /**
   * Gets a substring from start to end (exclusive)
   * @param start - Starting index (inclusive)
   * @param end - Ending index (exclusive)
   * @returns Substring
   */
  substring(start: number, end: number): string {
    if (start < 0 || end > this.length() || start > end) {
      throw new Error('Invalid substring range');
    }

    if (this.isLeaf()) {
      return this.text!.substring(start, end);
    }

    if (end <= this.weight) {
      // Entirely in left subtree
      return this.left!.substring(start, end);
    } else if (start >= this.weight) {
      // Entirely in right subtree
      return this.right!.substring(start - this.weight, end - this.weight);
    } else {
      // Spans both subtrees
      const leftPart = this.left!.substring(start, this.weight);
      const rightPart = this.right!.substring(0, end - this.weight);
      return leftPart + rightPart;
    }
  }
}

/**
 * Rope class - main interface for rope operations
 */
export class Rope {
  root?: RopeNode;

  constructor(text?: string) {
    if (text) {
      this.root = new RopeNode(text);
    }
  }

  /**
   * Returns the total length of the text
   */
  length(): number {
    return this.root ? this.root.length() : 0;
  }

  /**
   * Returns the entire text as a string
   */
  toString(): string {
    return this.root ? this.root.toString() : '';
  }

  /**
   * Gets the character at the specified index
   */
  charAt(index: number): string {
    if (!this.root) {
      throw new Error('Rope is empty');
    }
    return this.root.charAt(index);
  }

  /**
   * Gets a substring from start to end
   */
  substring(start: number, end: number): string {
    if (!this.root) {
      return '';
    }
    return this.root.substring(start, end);
  }

  /**
   * Inserts text at the specified position
   * @param pos - Position to insert at (0-indexed)
   * @param text - Text to insert
   */
  insert(pos: number, text: string): void {
    if (pos < 0 || pos > this.length()) {
      throw new Error('Insert position out of bounds');
    }

    const newNode = new RopeNode(text);

    if (!this.root) {
      this.root = newNode;
      return;
    }

    // Simple implementation: split at pos and concatenate
    // This will be optimized with proper tree operations later
    if (pos === 0) {
      this.root = this.concatenate(newNode, this.root);
    } else if (pos === this.length()) {
      this.root = this.concatenate(this.root, newNode);
    } else {
      const [left, right] = this.split(this.root, pos);
      const temp = this.concatenate(left, newNode);
      this.root = this.concatenate(temp, right);
    }
  }

  /**
   * Deletes text from pos to pos + len
   * @param pos - Starting position
   * @param len - Number of characters to delete
   */
  delete(pos: number, len: number): void {
    if (pos < 0 || pos + len > this.length()) {
      throw new Error('Delete range out of bounds');
    }

    if (!this.root || len === 0) {
      return;
    }

    // Split at pos and pos + len, then concatenate the outer parts
    const [left, temp] = this.split(this.root, pos);
    if (!temp) {
      this.root = left;
      return;
    }
    const [, right] = this.split(temp, len);

    if (!left) {
      this.root = right;
    } else if (!right) {
      this.root = left;
    } else {
      this.root = this.concatenate(left, right);
    }
  }

  /**
   * Splits a rope at the given position
   * @param node - Node to split
   * @param pos - Position to split at
   * @returns Tuple of [left, right] ropes
   */
  private split(node: RopeNode, pos: number): [RopeNode | undefined, RopeNode | undefined] {
    if (!node) {
      return [undefined, undefined];
    }

    if (node.isLeaf()) {
      if (pos === 0) {
        return [undefined, node];
      } else if (pos >= node.text!.length) {
        return [node, undefined];
      } else {
        const leftText = node.text!.substring(0, pos);
        const rightText = node.text!.substring(pos);
        return [new RopeNode(leftText), new RopeNode(rightText)];
      }
    }

    if (pos <= node.weight) {
      const [left, right] = this.split(node.left!, pos);
      return [left, this.concatenate(right, node.right)];
    } else {
      const [left, right] = this.split(node.right!, pos - node.weight);
      return [this.concatenate(node.left, left), right];
    }
  }

  /**
   * Concatenates two rope nodes
   * @param left - Left rope
   * @param right - Right rope
   * @returns Concatenated rope
   */
  private concatenate(left: RopeNode | undefined, right: RopeNode | undefined): RopeNode | undefined {
    if (!left) return right;
    if (!right) return left;

    const parent = new RopeNode();
    parent.left = left;
    parent.right = right;
    parent.weight = left.length();
    parent.height = Math.max(this.getHeight(left), this.getHeight(right)) + 1;

    return parent;
  }

  /**
   * Gets the height of a node
   */
  private getHeight(node: RopeNode | undefined): number {
    return node ? node.height : 0;
  }
}

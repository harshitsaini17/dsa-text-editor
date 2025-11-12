import { Operation } from './types';

export class Outbox {
  private pending: Operation[] = [];
  private nextLocalSeq = 0;

  add(op: Operation): void {
    this.pending.push(op);
  }

  removeUntil(seq: number): void {
    this.pending = this.pending.filter(op => op.clientSeq > seq);
  }

  getAll(): Operation[] {
    return [...this.pending];
  }

  isEmpty(): boolean {
    return this.pending.length === 0;
  }

  clear(): void {
    this.pending = [];
  }

  getNextSeq(): number {
    return this.nextLocalSeq++;
  }

  /**
   * Calculate the length of pending operations
   * This is the diff between local editor and server's view
   */
  getPendingLength(): number {
    return this.pending.reduce((acc, op) => {
      if (op.type === 'insert' && op.text) {
        return acc + op.text.length;
      } else if (op.type === 'delete' && op.len) {
        return acc - op.len;
      }
      return acc;
    }, 0);
  }

  size(): number {
    return this.pending.length;
  }
}

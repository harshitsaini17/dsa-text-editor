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

  size(): number {
    return this.pending.length;
  }
}

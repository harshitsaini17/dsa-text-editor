import { IntervalTree } from './intervalTree';

export interface CursorInfo {
  clientId: string;
  from: number;
  to: number;
  color: string;
  name: string;
}

export class CursorManager {
  private tree: IntervalTree;
  private cursors: Map<string, CursorInfo>;
  private colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  private colorIndex = 0;

  constructor() {
    this.tree = new IntervalTree();
    this.cursors = new Map();
  }

  updateCursor(clientId: string, from: number, to: number, name?: string): void {
    // Remove old cursor if exists
    if (this.cursors.has(clientId)) {
      const old = this.cursors.get(clientId)!;
      // Note: deleteNode is not fully implemented yet
      // this.tree.deleteNode({ start: old.from, end: old.to, clientId });
      old; // Suppress unused warning
    }

    // Add new cursor
    const color = this.cursors.get(clientId)?.color || this.getNextColor();
    const cursorInfo: CursorInfo = {
      clientId,
      from,
      to,
      color,
      name: name || clientId.slice(0, 8),
    };

    this.cursors.set(clientId, cursorInfo);
    this.tree.insert(from, to, { clientId, color });
  }

  removeCursor(clientId: string): void {
    const cursor = this.cursors.get(clientId);
    if (cursor) {
      // Note: deleteNode is not fully implemented yet
      // this.tree.deleteNode({ start: cursor.from, end: cursor.to, clientId });
      this.cursors.delete(clientId);
    }
  }

  getCursor(clientId: string): CursorInfo | undefined {
    return this.cursors.get(clientId);
  }

  getAllCursors(): CursorInfo[] {
    return Array.from(this.cursors.values());
  }

  getCursorsAt(pos: number): CursorInfo[] {
    const intervals = this.tree.findOverlapping(pos, pos);
    return intervals
      .map(interval => this.cursors.get(interval.data.clientId))
      .filter((cursor): cursor is CursorInfo => cursor !== undefined);
  }

  shiftCursors(pos: number, delta: number): void {
    this.tree.shiftAll(pos, delta);
    
    // Update cursor positions in the map
    for (const [clientId, cursor] of this.cursors.entries()) {
      if (cursor.from >= pos) {
        cursor.from += delta;
      }
      if (cursor.to >= pos) {
        cursor.to += delta;
      }
      this.cursors.set(clientId, cursor);
    }
  }

  private getNextColor(): string {
    const color = this.colors[this.colorIndex];
    this.colorIndex = (this.colorIndex + 1) % this.colors.length;
    return color;
  }

  clear(): void {
    this.cursors.clear();
    this.tree = new IntervalTree();
  }
}

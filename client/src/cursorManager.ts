export interface CursorInfo {
  clientId: string;
  x: number;
  y: number;
  color: string;
  name: string;
}

export class CursorManager {
  private cursors: Map<string, CursorInfo>;
  private colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  private colorIndex = 0;

  constructor() {
    this.cursors = new Map();
  }

  updateCursor(clientId: string, x: number, y: number, name?: string): void {
    // Add or update cursor
    const color = this.cursors.get(clientId)?.color || this.getNextColor();
    const cursorInfo: CursorInfo = {
      clientId,
      x,
      y,
      color,
      name: name || clientId.slice(0, 8),
    };

    this.cursors.set(clientId, cursorInfo);
  }

  removeCursor(clientId: string): void {
    this.cursors.delete(clientId);
  }

  getCursor(clientId: string): CursorInfo | undefined {
    return this.cursors.get(clientId);
  }

  getAllCursors(): CursorInfo[] {
    return Array.from(this.cursors.values());
  }

  // Mouse cursors don't need position-based queries or shifting

  private getNextColor(): string {
    const color = this.colors[this.colorIndex];
    this.colorIndex = (this.colorIndex + 1) % this.colors.length;
    return color;
  }

  clear(): void {
    this.cursors.clear();
  }
}

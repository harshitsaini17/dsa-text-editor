/**
 * Fenwick Tree edge case tests
 */

import { FenwickTree } from '../server/src/fenwick';

describe('Fenwick Tree - Edge Cases', () => {
  it('should handle empty tree queries', () => {
    const tree = new FenwickTree(10);
    expect(tree.query(0)).toBe(0);
    expect(tree.query(5)).toBe(0);
    expect(tree.query(9)).toBe(0);
  });

  it('should handle single element updates', () => {
    const tree = new FenwickTree(10);
    tree.update(0, 5);
    expect(tree.query(0)).toBe(5);
    expect(tree.query(1)).toBe(5);
    expect(tree.query(5)).toBe(5);
  });

  it('should handle boundary index updates', () => {
    const tree = new FenwickTree(100);
    tree.update(0, 1);
    tree.update(99, 1);
    expect(tree.query(0)).toBe(1);
    expect(tree.query(50)).toBe(1);
    expect(tree.query(99)).toBe(2);
  });

  it('should handle negative deltas', () => {
    const tree = new FenwickTree(10);
    tree.update(0, 10);
    tree.update(5, 5);
    expect(tree.query(9)).toBe(15);
    
    tree.update(3, -3);
    expect(tree.query(9)).toBe(12);
  });

  it('should handle consecutive inserts at same position', () => {
    const tree = new FenwickTree(100);
    tree.addInsert(10, 5);  // Insert 5 chars at pos 10
    tree.addInsert(10, 3);  // Insert 3 more chars at pos 10
    
    expect(tree.query(9)).toBe(0);   // Before insert position
    expect(tree.query(10)).toBe(8);  // At insert position: 5 + 3
    expect(tree.query(20)).toBe(8);  // After insert position
  });

  it('should handle consecutive deletes at same position', () => {
    const tree = new FenwickTree(100);
    tree.addDelete(10, 5);  // Delete 5 chars at pos 10
    tree.addDelete(10, 3);  // Delete 3 more chars at pos 10
    
    expect(tree.query(9)).toBe(0);    // Before delete position
    expect(tree.query(10)).toBe(-8);  // At delete position: -5 + -3
    expect(tree.query(20)).toBe(-8);  // After delete position
  });

  it('should handle interleaved inserts and deletes', () => {
    const tree = new FenwickTree(100);
    tree.addInsert(10, 5);   // +5 at pos 10
    tree.addDelete(20, 3);   // -3 at pos 20
    tree.addInsert(15, 2);   // +2 at pos 15
    tree.addDelete(25, 4);   // -4 at pos 25
    
    expect(tree.query(9)).toBe(0);
    expect(tree.query(10)).toBe(5);
    expect(tree.query(15)).toBe(7);    // 5 + 2
    expect(tree.query(20)).toBe(4);    // 5 + 2 - 3
    expect(tree.query(25)).toBe(0);    // 5 + 2 - 3 - 4
    expect(tree.query(50)).toBe(0);    // 5 + 2 - 3 - 4
  });

  it('should handle large index values', () => {
    const tree = new FenwickTree(10000);
    tree.update(5000, 100);
    tree.update(9999, 50);
    
    expect(tree.query(4999)).toBe(0);
    expect(tree.query(5000)).toBe(100);
    expect(tree.query(9999)).toBe(150);
  });

  it('should handle zero-length operations', () => {
    const tree = new FenwickTree(100);
    tree.addInsert(10, 0);  // Insert 0 chars
    tree.addDelete(20, 0);  // Delete 0 chars
    
    expect(tree.query(50)).toBe(0);
  });

  it('should maintain consistency after many operations', () => {
    const tree = new FenwickTree(1000);
    let expectedSum = 0;
    
    // Perform 100 random operations
    for (let i = 0; i < 100; i++) {
      const pos = Math.floor(Math.random() * 500);
      const delta = Math.floor(Math.random() * 10) - 5;  // -5 to 4
      tree.update(pos, delta);
      if (pos <= 500) {
        expectedSum += delta;
      }
    }
    
    expect(tree.query(999)).toBe(expectedSum);
  });

  it('should correctly transform positions through multiple operations', () => {
    const tree = new FenwickTree(100);
    
    // Simulate editing: "hello world" -> "hello beautiful world"
    tree.addInsert(6, 10);  // Insert "beautiful " at position 6
    
    // Position 11 (after "world") should shift by +10
    const oldPos = 11;
    const newPos = oldPos + tree.query(oldPos);
    expect(newPos).toBe(21);
  });

  it('should handle overlapping operation ranges', () => {
    const tree = new FenwickTree(100);
    
    // Delete range [10, 15)
    tree.addDelete(10, 5);
    
    // Delete range [12, 18) (overlaps with previous)
    tree.addDelete(12, 6);
    
    // Query at position 20 should reflect both deletes
    expect(tree.query(20)).toBe(-11);  // -5 + -6
  });
});

describe('Fenwick Tree - Performance', () => {
  it('should handle 10000 operations efficiently', () => {
    const tree = new FenwickTree(10000);
    const start = Date.now();
    
    for (let i = 0; i < 10000; i++) {
      tree.update(i % 10000, 1);
    }
    
    for (let i = 0; i < 10000; i++) {
      tree.query(i % 10000);
    }
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);  // Should complete in < 100ms
  });

  it('should maintain O(log n) query complexity', () => {
    const sizes = [100, 1000, 10000];
    const times: number[] = [];
    
    for (const size of sizes) {
      const tree = new FenwickTree(size);
      for (let i = 0; i < size; i++) {
        tree.update(i, 1);
      }
      
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        tree.query(Math.floor(Math.random() * size));
      }
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }
    
    // Time should grow logarithmically, not linearly
    // 10x size increase should be less than 2x time increase
    const ratio = times[2] / times[0];
    expect(ratio).toBeLessThan(5);
  });
});

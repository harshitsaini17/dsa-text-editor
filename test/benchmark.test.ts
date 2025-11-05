/**
 * Performance benchmark tests
 */

import { Rope } from '../server/src/rope';
import { FenwickTree } from '../server/src/fenwick';
import { transform } from '../server/src/transform';
import { Operation } from '../server/src/types';

describe('Performance Benchmarks', () => {
  describe('Rope Operations', () => {
    it('should complete insert operations in < 5ms for 10k char documents', () => {
      const rope = new Rope('a'.repeat(10000));
      const iterations = 100;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        rope.insert(5000, 'x');
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(5);
      console.log(`Rope insert avg: ${avgTime.toFixed(3)}ms`);
    });

    it('should complete delete operations in < 5ms for 10k char documents', () => {
      const rope = new Rope('a'.repeat(10000));
      const iterations = 100;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        rope.delete(5000, 10);
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(5);
      console.log(`Rope delete avg: ${avgTime.toFixed(3)}ms`);
    });

    it('should complete charAt operations in < 1ms', () => {
      const rope = new Rope('a'.repeat(10000));
      const iterations = 1000;
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        rope.charAt(Math.floor(Math.random() * 10000));
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(1);
      console.log(`Rope charAt avg: ${avgTime.toFixed(3)}ms`);
    });

    it('should handle large documents (100k+ chars) efficiently', () => {
      const largeText = 'a'.repeat(100000);
      
      const start = performance.now();
      const rope = new Rope(largeText);
      rope.insert(50000, 'test');
      rope.delete(25000, 100);
      rope.charAt(75000);
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(50);
      console.log(`Large document operations: ${elapsed.toFixed(3)}ms`);
    });
  });

  describe('Transform Operations', () => {
    it('should transform operations in < 1ms', () => {
      const op1: Operation = {
        type: 'insert',
        pos: 100,
        text: 'hello',
        clientId: 'A',
        clientSeq: 1,
      };

      const op2: Operation = {
        type: 'insert',
        pos: 200,
        text: 'world',
        clientId: 'B',
        clientSeq: 1,
      };

      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        transform(op1, op2);
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(1);
      console.log(`Transform avg: ${avgTime.toFixed(3)}ms`);
    });

    it('should handle complex transform chains efficiently', () => {
      const ops: Operation[] = [];
      for (let i = 0; i < 100; i++) {
        ops.push({
          type: i % 2 === 0 ? 'insert' : 'delete',
          pos: Math.floor(Math.random() * 1000),
          clientId: `client${i % 5}`,
          clientSeq: i,
          ...(i % 2 === 0 
            ? { text: 'x'.repeat(Math.floor(Math.random() * 10) + 1) }
            : { len: Math.floor(Math.random() * 10) + 1 }
          ),
        });
      }

      const start = performance.now();
      for (let i = 0; i < ops.length - 1; i++) {
        transform(ops[i], ops[i + 1]);
      }
      const elapsed = performance.now() - start;
      
      expect(elapsed).toBeLessThan(100);
      console.log(`Complex transform chain: ${elapsed.toFixed(3)}ms`);
    });
  });

  describe('Fenwick Tree Operations', () => {
    it('should maintain O(log n) complexity for updates', () => {
      const sizes = [1000, 10000, 100000];
      const times: number[] = [];

      for (const size of sizes) {
        const tree = new FenwickTree(size);
        const iterations = 1000;
        
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          tree.update(Math.floor(Math.random() * size), 1);
        }
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }

      // 10x size increase should result in < 2x time increase (logarithmic)
      const ratio1 = times[1] / times[0];
      const ratio2 = times[2] / times[1];
      
      expect(ratio1).toBeLessThan(2);
      expect(ratio2).toBeLessThan(2);
      console.log(`Fenwick ratios: ${ratio1.toFixed(2)}x, ${ratio2.toFixed(2)}x`);
    });

    it('should query positions in < 1ms', () => {
      const tree = new FenwickTree(10000);
      for (let i = 0; i < 1000; i++) {
        tree.update(i, 1);
      }

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        tree.query(Math.floor(Math.random() * 10000));
      }
      const elapsed = performance.now() - start;
      const avgTime = elapsed / iterations;
      
      expect(avgTime).toBeLessThan(1);
      console.log(`Fenwick query avg: ${avgTime.toFixed(3)}ms`);
    });
  });

  describe('End-to-End Performance', () => {
    it('should handle rapid concurrent edits efficiently', () => {
      const rope = new Rope('Hello world');
      const operations: Operation[] = [];

      // Simulate 100 rapid operations from 3 clients
      for (let i = 0; i < 100; i++) {
        const clientId = `client${i % 3}`;
        operations.push({
          type: i % 3 === 0 ? 'delete' : 'insert',
          pos: Math.floor(Math.random() * (rope.length() + 1)),
          clientId,
          clientSeq: i,
          ...(i % 3 === 0
            ? { len: Math.min(5, rope.length()) }
            : { text: 'x'.repeat(Math.floor(Math.random() * 5) + 1) }
          ),
        });
      }

      const start = performance.now();
      for (const op of operations) {
        // Simulate server processing
        if (op.type === 'insert' && op.text) {
          rope.insert(Math.min(op.pos, rope.length()), op.text);
        } else if (op.type === 'delete' && op.len) {
          const actualLen = Math.min(op.len, rope.length() - op.pos);
          if (actualLen > 0) {
            rope.delete(op.pos, actualLen);
          }
        }
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      console.log(`100 operations: ${elapsed.toFixed(3)}ms`);
    });

    it('should maintain 60 FPS processing rate', () => {
      const rope = new Rope('Start text ');
      const frameTime = 1000 / 60; // ~16.67ms per frame

      let opsInFrame = 0;
      const start = performance.now();
      
      while (performance.now() - start < frameTime) {
        rope.insert(rope.length(), 'x');
        opsInFrame++;
      }

      console.log(`Operations per frame (60 FPS): ${opsInFrame}`);
      expect(opsInFrame).toBeGreaterThan(10);
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory after 1000+ operations', () => {
      if (typeof global.gc !== 'function') {
        console.log('Skipping memory test - run with --expose-gc flag');
        return;
      }

      const rope = new Rope('Initial text');
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform 1000 operations
      for (let i = 0; i < 1000; i++) {
        rope.insert(Math.floor(Math.random() * rope.length()), 'x');
        if (i % 100 === 0) {
          rope.delete(0, 10);
        }
      }

      global.gc();
      const finalMemory = process.memoryUsage().heapUsed;
      const growthMB = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`Memory growth: ${growthMB.toFixed(2)} MB`);
      expect(growthMB).toBeLessThan(10);
    });
  });
});

/**
 * End-to-end tests for collaborative editing scenarios
 */

import { Operation } from '../server/src/types';
import { transform } from '../server/src/transform';
import { Rope } from '../server/src/rope';

describe('E2E: Two-client scenario', () => {
  it('should converge when both clients insert at different positions', () => {
    const initialDoc = 'hello';
    
    // Client A inserts " world" at position 5
    const opA: Operation = {
      type: 'insert',
      pos: 5,
      text: ' world',
      clientId: 'A',
      clientSeq: 1,
    };

    // Client B inserts "!" at position 5
    const opB: Operation = {
      type: 'insert',
      pos: 5,
      text: '!',
      clientId: 'B',
      clientSeq: 1,
    };

    // Transform ops
    const opA_prime = transform(opA, opB);
    const opB_prime = transform(opB, opA);

    // Apply to document A: hello -> hello! -> hello! world
    const ropeA = new Rope(initialDoc);
    ropeA.insert(opB.pos, opB.text!);
    ropeA.insert(opA_prime.pos, opA_prime.text!);
    const docA = ropeA.toString();

    // Apply to document B: hello -> hello world -> hello! world
    const ropeB = new Rope(initialDoc);
    ropeB.insert(opA.pos, opA.text!);
    ropeB.insert(opB_prime.pos, opB_prime.text!);
    const docB = ropeB.toString();

    expect(docA).toBe(docB);
    expect(docA).toBe('hello! world');
  });

  it('should converge when one client inserts and another deletes', () => {
    const initialDoc = 'hello world';
    
    // Client A deletes "world" (positions 6-11)
    const opA: Operation = {
      type: 'delete',
      pos: 6,
      len: 5,
      clientId: 'A',
      clientSeq: 1,
    };

    // Client B inserts "beautiful " at position 6
    const opB: Operation = {
      type: 'insert',
      pos: 6,
      text: 'beautiful ',
      clientId: 'B',
      clientSeq: 1,
    };

    // Transform ops
    const opA_prime = transform(opA, opB);
    const opB_prime = transform(opB, opA);

    // Apply to document A
    const ropeA = new Rope(initialDoc);
    ropeA.insert(opB.pos, opB.text!);
    ropeA.delete(opA_prime.pos, opA_prime.len!);
    const docA = ropeA.toString();

    // Apply to document B
    const ropeB = new Rope(initialDoc);
    ropeB.delete(opA.pos, opA.len!);
    ropeB.insert(opB_prime.pos, opB_prime.text!);
    const docB = ropeB.toString();

    expect(docA).toBe(docB);
    expect(docA).toBe('hello beautiful ');
  });
});

describe('E2E: Three-client convergence', () => {
  it('should converge when three clients make concurrent edits', () => {
    const initialDoc = 'abc';

    // Client A inserts "1" at position 1
    const opA: Operation = {
      type: 'insert',
      pos: 1,
      text: '1',
      clientId: 'A',
      clientSeq: 1,
    };

    // Client B inserts "2" at position 2
    const opB: Operation = {
      type: 'insert',
      pos: 2,
      text: '2',
      clientId: 'B',
      clientSeq: 1,
    };

    // Client C deletes character at position 0 (length 1)
    const opC: Operation = {
      type: 'delete',
      pos: 0,
      len: 1,
      clientId: 'C',
      clientSeq: 1,
    };

    // Transform ops for each client
    // Client A receives B then C
    let opB_atA = transform(opB, opA);
    let opC_atA = transform(transform(opC, opA), opB_atA);

    // Client B receives A then C
    let opA_atB = transform(opA, opB);
    let opC_atB = transform(transform(opC, opB), opA_atB);

    // Client C receives A then B
    let opA_atC = transform(opA, opC);
    let opB_atC = transform(transform(opB, opC), opA_atC);

    // Apply all ops at client A: abc -> a1bc -> a1b2c -> 1b2c
    const ropeA = new Rope(initialDoc);
    ropeA.insert(opA.pos, opA.text!);
    ropeA.insert(opB_atA.pos, opB_atA.text!);
    ropeA.delete(opC_atA.pos, opC_atA.len!);
    const docA = ropeA.toString();

    // Apply all ops at client B: abc -> ab2c -> a1b2c -> 1b2c
    const ropeB = new Rope(initialDoc);
    ropeB.insert(opB.pos, opB.text!);
    ropeB.insert(opA_atB.pos, opA_atB.text!);
    ropeB.delete(opC_atB.pos, opC_atB.len!);
    const docB = ropeB.toString();

    // Apply all ops at client C: abc -> bc -> b1c -> b12c... wait this won't match
    // Let's recalculate properly
    const ropeC = new Rope(initialDoc);
    ropeC.delete(opC.pos, opC.len!);
    ropeC.insert(opA_atC.pos, opA_atC.text!);
    ropeC.insert(opB_atC.pos, opB_atC.text!);
    const docC = ropeC.toString();

    expect(docA).toBe(docB);
    expect(docB).toBe(docC);
  });
});

describe('E2E: Concurrent same-position inserts', () => {
  it('should handle multiple clients inserting at the same position', () => {
    const initialDoc = 'text';

    const opA: Operation = {
      type: 'insert',
      pos: 0,
      text: 'A',
      clientId: 'clientA',
      clientSeq: 1,
    };

    const opB: Operation = {
      type: 'insert',
      pos: 0,
      text: 'B',
      clientId: 'clientB',
      clientSeq: 1,
    };

    const opC: Operation = {
      type: 'insert',
      pos: 0,
      text: 'C',
      clientId: 'clientC',
      clientSeq: 1,
    };

    // Transform and apply in different orders at each client
    // All clients should converge to same state based on clientId ordering

    // Client A applies: A, then B', then C''
    const ropeA = new Rope(initialDoc);
    ropeA.insert(opA.pos, opA.text!);
    const opB_A = transform(opB, opA);
    ropeA.insert(opB_A.pos, opB_A.text!);
    const opC_A = transform(transform(opC, opA), opB_A);
    ropeA.insert(opC_A.pos, opC_A.text!);
    const docA = ropeA.toString();

    // Client B applies: B, then A', then C''
    const ropeB = new Rope(initialDoc);
    ropeB.insert(opB.pos, opB.text!);
    const opA_B = transform(opA, opB);
    ropeB.insert(opA_B.pos, opA_B.text!);
    const opC_B = transform(transform(opC, opB), opA_B);
    ropeB.insert(opC_B.pos, opC_B.text!);
    const docB = ropeB.toString();

    // Client C applies: C, then A', then B''
    const ropeC = new Rope(initialDoc);
    ropeC.insert(opC.pos, opC.text!);
    const opA_C = transform(opA, opC);
    ropeC.insert(opA_C.pos, opA_C.text!);
    const opB_C = transform(transform(opB, opC), opA_C);
    ropeC.insert(opB_C.pos, opB_C.text!);
    const docC = ropeC.toString();

    // All should converge (based on lexicographic clientId ordering: A < B < C)
    expect(docA).toBe(docB);
    expect(docB).toBe(docC);
  });
});

describe('E2E: Overlapping deletes', () => {
  it('should handle overlapping delete operations', () => {
    const initialDoc = 'abcdefgh';

    // Client A deletes "cde" (positions 2-5)
    const opA: Operation = {
      type: 'delete',
      pos: 2,
      len: 3,
      clientId: 'A',
      clientSeq: 1,
    };

    // Client B deletes "def" (positions 3-6)
    const opB: Operation = {
      type: 'delete',
      pos: 3,
      len: 3,
      clientId: 'B',
      clientSeq: 1,
    };

    // Transform
    const opA_prime = transform(opA, opB);
    const opB_prime = transform(opB, opA);

    // Apply to client A
    const ropeA = new Rope(initialDoc);
    ropeA.delete(opA.pos, opA.len!);
    ropeA.delete(opA_prime.pos, opA_prime.len!);
    const docA = ropeA.toString();

    // Apply to client B
    const ropeB = new Rope(initialDoc);
    ropeB.delete(opB.pos, opB.len!);
    ropeB.delete(opB_prime.pos, opB_prime.len!);
    const docB = ropeB.toString();

    expect(docA).toBe(docB);
  });
});

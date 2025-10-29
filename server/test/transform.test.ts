import { transform, transformAgainstOps } from '../src/transform';
import { Operation, InsertOperation, DeleteOperation } from '../../shared/types';

/**
 * Test suite for Operational Transform algorithm
 */

describe('OT Transform - Insert vs Insert', () => {
  test('Insert before insert', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'world',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 0,
      text: 'Hello ',
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    expect(result.pos).toBe(11); // Shifted right by 6
  });

  test('Insert after insert', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 0,
      text: 'Hello',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 10,
      text: 'world',
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    expect(result.pos).toBe(0); // No change
  });

  test('Insert at same position - tie-breaking by clientId', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'AAA',
      clientId: 'client2',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'BBB',
      clientId: 'client1',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    // client1 < client2, so B wins and A is shifted
    expect(result.pos).toBe(8);
  });
});

describe('OT Transform - Insert vs Delete', () => {
  test('Insert before delete', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 0,
      text: 'Hello',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 10,
      len: 5,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    expect(result.pos).toBe(0); // No change
  });

  test('Insert after delete', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 15,
      text: 'Hello',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 10,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    expect(result.pos).toBe(5); // Shifted left by 10
  });

  test('Insert inside deleted range', () => {
    const opA: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'X',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 10,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as InsertOperation;
    expect(result.pos).toBe(0); // Moved to delete start
  });
});

describe('OT Transform - Delete vs Insert', () => {
  test('Delete before insert', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 5,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 10,
      text: 'Hello',
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(5);
  });

  test('Delete after insert', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 10,
      len: 5,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 0,
      text: 'Hello',
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(15); // Shifted right by 5
    expect(result.len).toBe(5);
  });

  test('Insert inside delete range', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 10,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'XXX',
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(13); // Extended by 3
  });
});

describe('OT Transform - Delete vs Delete', () => {
  test('No overlap - B before A', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 10,
      len: 5,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 5,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(5);
    expect(result.len).toBe(5);
  });

  test('No overlap - B after A', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 5,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 10,
      len: 5,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(5);
  });

  test('B contains A entirely', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 5,
      len: 5,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 15,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(0);
  });

  test('A contains B entirely', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 15,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 5,
      len: 5,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(10);
  });

  test('Partial overlap - B from left', () => {
    const opA: DeleteOperation = {
      type: 'delete',
      pos: 5,
      len: 10,
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 8,
      clientId: 'client2',
      clientSeq: 1,
    };

    const result = transform(opA, opB) as DeleteOperation;
    expect(result.pos).toBe(0);
    expect(result.len).toBe(7); // 15 - 8 = 7
  });
});

describe('OT Convergence Tests', () => {
  test('Convergence: A then B\' === B then A\'', () => {
    let doc1 = 'Hello World';
    let doc2 = 'Hello World';

    const opA: InsertOperation = {
      type: 'insert',
      pos: 6,
      text: 'Beautiful ',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: InsertOperation = {
      type: 'insert',
      pos: 11,
      text: '!',
      clientId: 'client2',
      clientSeq: 1,
    };

    // Apply A then B'
    doc1 = doc1.slice(0, opA.pos) + opA.text + doc1.slice(opA.pos);
    const opBPrime = transform(opB, opA) as InsertOperation;
    doc1 = doc1.slice(0, opBPrime.pos) + opBPrime.text + doc1.slice(opBPrime.pos);

    // Apply B then A'
    doc2 = doc2.slice(0, opB.pos) + opB.text + doc2.slice(opB.pos);
    const opAPrime = transform(opA, opB) as InsertOperation;
    doc2 = doc2.slice(0, opAPrime.pos) + opAPrime.text + doc2.slice(opAPrime.pos);

    expect(doc1).toBe(doc2);
    expect(doc1).toBe('Hello Beautiful World!');
  });

  test('Convergence: Insert and Delete', () => {
    let doc1 = 'Hello World';
    let doc2 = 'Hello World';

    const opA: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: ' Beautiful',
      clientId: 'client1',
      clientSeq: 1,
    };

    const opB: DeleteOperation = {
      type: 'delete',
      pos: 0,
      len: 6,
      clientId: 'client2',
      clientSeq: 1,
    };

    // Apply A then B'
    doc1 = doc1.slice(0, opA.pos) + opA.text + doc1.slice(opA.pos);
    const opBPrime = transform(opB, opA) as DeleteOperation;
    doc1 = doc1.slice(0, opBPrime.pos) + doc1.slice(opBPrime.pos + opBPrime.len);

    // Apply B then A'
    doc2 = doc2.slice(0, opB.pos) + doc2.slice(opB.pos + opB.len);
    const opAPrime = transform(opA, opB) as InsertOperation;
    doc2 = doc2.slice(0, opAPrime.pos) + opAPrime.text + doc2.slice(opAPrime.pos);

    expect(doc1).toBe(doc2);
  });
});

describe('Transform Against Operations', () => {
  test('Transform against empty array', () => {
    const op: InsertOperation = {
      type: 'insert',
      pos: 5,
      text: 'Hello',
      clientId: 'client1',
      clientSeq: 1,
    };

    const result = transformAgainstOps(op, []);
    expect(result).toEqual(op);
  });

  test('Transform against multiple operations', () => {
    const op: InsertOperation = {
      type: 'insert',
      pos: 10,
      text: 'X',
      clientId: 'client1',
      clientSeq: 1,
    };

    const ops: Operation[] = [
      {
        type: 'insert',
        pos: 0,
        text: 'AAA',
        clientId: 'client2',
        clientSeq: 1,
      },
      {
        type: 'insert',
        pos: 5,
        text: 'BBB',
        clientId: 'client3',
        clientSeq: 1,
      },
    ];

    const result = transformAgainstOps(op, ops) as InsertOperation;
    expect(result.pos).toBe(16); // Shifted by 3 + 3
  });
});

# Collaborative Text Editor - Architecture

## System Overview

This is a production-grade real-time collaborative text editor built with advanced data structures and algorithms. The system enables multiple users to edit the same document simultaneously with conflict-free convergence guaranteed by Operational Transformation (OT).

## High-Level Architecture

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client A  │◄──────────────────────────►│             │
└─────────────┘                             │             │
                                            │   Server    │
┌─────────────┐         WebSocket          │             │
│   Client B  │◄──────────────────────────►│  (Node.js)  │
└─────────────┘                             │             │
                                            │             │
┌─────────────┐         WebSocket          │             │
│   Client C  │◄──────────────────────────►│             │
└─────────────┘                             └─────────────┘
```

## Data Structures

### 1. Rope (Server - Document Storage)

**Purpose:** Efficient text storage and manipulation for large documents

**Structure:** Balanced binary tree where:
- Each leaf node contains a text chunk
- Each internal node stores the total weight (length) of its left subtree

**Operations:**
- `insert(pos, text)`: O(log n) - Insert text at position
- `delete(pos, len)`: O(log n) - Delete text range
- `charAt(pos)`: O(log n) - Get character at position
- `substring(start, end)`: O(log n) - Extract text range

**Key Features:**
- Balanced with AVL rotation algorithms (height tracking)
- Split and concatenate operations for efficient modifications
- Much faster than string concatenation for large documents

**Example:**
```
Initial: "hello world"
After insert(5, "!"): "hello! world"

Tree structure:
        [11]
       /    \
   [6]       [6]
  /  \      /  \
"hello" "!"  " world"
```

### 2. Fenwick Tree (Server - Position Transformation)

**Purpose:** Track cumulative position shifts from historical operations

**Structure:** Binary Indexed Tree (BIT) that maintains prefix sums

**Operations:**
- `update(idx, delta)`: O(log n) - Add delta to position
- `query(idx)`: O(log n) - Get cumulative shift up to position
- `addInsert(pos, len)`: Add insert operation
- `addDelete(pos, len)`: Add delete operation

**Use Case:**
When a client submits an operation with an old sequence number, we need to transform its position based on all intervening operations. The Fenwick Tree efficiently computes the cumulative position shift.

**Example:**
```
Operations:
1. Insert 5 chars at pos 10  → query(15) = +5
2. Delete 3 chars at pos 20  → query(25) = +5-3 = +2
3. Insert 2 chars at pos 15  → query(20) = +5-3+2 = +4

Client with old op at pos 18 transforms to: 18 + query(18) = 18 + 4 = 22
```

### 3. Interval Tree (Client - Cursor Management)

**Purpose:** Track and query overlapping cursor/selection ranges

**Structure:** Augmented Red-Black tree where:
- Each node stores an interval `[start, end]`
- Each node maintains `max` endpoint in subtree
- Red-Black balancing ensures O(log n) operations

**Operations:**
- `insert(start, end, data)`: O(log n) - Add cursor/selection
- `findOverlapping(start, end)`: O(log n + k) - Find overlaps
- `shiftAll(pos, delta)`: O(n) - Adjust positions after edit
- `deleteNode(node)`: O(log n) - Remove cursor

**Use Case:**
When rendering the editor, we need to find which remote cursors overlap with the visible region. The interval tree allows efficient querying without checking all cursors.

**Example:**
```
Cursors:
- Client A: [10, 15] (selection from pos 10-15)
- Client B: [20, 20] (cursor at pos 20)
- Client C: [12, 18] (selection overlaps with A)

findOverlapping(11, 14) → returns [Client A, Client C]
```

## Operational Transform (OT)

### Core Algorithm

OT ensures that concurrent operations converge to the same final state regardless of arrival order.

**Transform Function:** `transform(op1, op2) → op1'`
- Returns transformed version of `op1` that can be applied after `op2`
- Must satisfy:
  - **Convergence:** `apply(apply(S, op1), transform(op2, op1)) == apply(apply(S, op2), transform(op1, op2))`
  - **Causality:** Order-preserving within same client

**Four Operation Pairs:**

1. **Insert vs Insert**
   ```
   If pos1 < pos2: op1' = op1
   If pos1 > pos2: op1'.pos = pos1 + len2
   If pos1 == pos2: tie-break by clientId
   ```

2. **Insert vs Delete**
   ```
   If pos1 <= del_start: op1' = op1
   If pos1 >= del_end: op1'.pos = pos1 - del_len
   If pos1 in [del_start, del_end): op1'.pos = del_start
   ```

3. **Delete vs Insert**
   ```
   If del_end <= pos2: op1' = op1
   If del_start < pos2 < del_end: op1'.len += len2
   If del_start >= pos2: op1'.pos += len2
   ```

4. **Delete vs Delete**
   ```
   Compute intersection of ranges
   Adjust position and length accordingly
   ```

### Client-Side Rebase

Clients maintain an **outbox** of unacknowledged operations. When a server operation arrives:

1. Transform it against all pending operations
2. Apply to local document
3. Rebase all pending operations over the server op

```
Outbox: [op_local1, op_local2]
Server op arrives: op_server

1. op_server' = transform(op_server, op_local1)
2. op_server'' = transform(op_server', op_local2)
3. Apply op_server'' to document
4. op_local1' = transform(op_local1, op_server)
5. op_local2' = transform(op_local2, op_server')
6. New outbox: [op_local1', op_local2']
```

## Message Protocol

### Client → Server

**Join Request:**
```json
{
  "type": "join"
}
```

**Operation Submission:**
```json
{
  "type": "op",
  "op": {
    "type": "insert" | "delete",
    "pos": number,
    "clientId": string,
    "clientSeq": number,
    "text"?: string,  // for insert
    "len"?: number    // for delete
  }
}
```

**Cursor Update:**
```json
{
  "type": "cursor",
  "from": number,
  "to": number
}
```

### Server → Client

**Join Acknowledgement:**
```json
{
  "type": "joined",
  "clientId": string,
  "seq": number,
  "doc": string
}
```

**Operation Broadcast:**
```json
{
  "type": "op",
  "op": {
    "type": "insert" | "delete",
    "pos": number,
    "clientId": string,
    "clientSeq": number,
    "serverSeq": number,
    "text"?: string,
    "len"?: number
  }
}
```

**Acknowledgement:**
```json
{
  "type": "ack",
  "seq": number
}
```

**Cursor Broadcast:**
```json
{
  "type": "cursor",
  "clientId": string,
  "from": number,
  "to": number
}
```

**Disconnect Notification:**
```json
{
  "type": "disconnect",
  "clientId": string
}
```

## Performance Characteristics

| Operation | Time Complexity | Target Latency |
|-----------|----------------|----------------|
| Rope insert/delete | O(log n) | < 5ms for 10k chars |
| Fenwick update/query | O(log n) | < 1ms |
| Interval Tree insert | O(log n) | < 2ms |
| Interval Tree find overlapping | O(log n + k) | < 5ms |
| OT transform | O(1) | < 1ms |
| Server broadcast | O(clients) | P95 < 50ms |

## Scalability Considerations

### Current Limitations
- In-memory document storage (single server)
- All clients connected to same server instance
- No persistence layer

### Future Improvements
- **Horizontal scaling:** Partition documents across servers
- **Persistent storage:** Add database for document history
- **CRDT alternative:** Consider CRDTs for better P2P support
- **Snapshotting:** Periodic document snapshots to limit operation log growth
- **Compression:** Compress historical operations
- **Conflict resolution:** Enhanced merge strategies for rare edge cases

## Testing Strategy

### Unit Tests
- Rope: Insert/delete/charAt with various sizes
- Fenwick Tree: Edge cases, boundary conditions
- Transform: All 4 operation pairs, convergence properties
- Interval Tree: Overlapping queries, balancing

### Integration Tests
- 2-client scenario: Concurrent inserts/deletes
- 3-client scenario: Complex operation sequences
- Rapid typing: 10+ chars/sec per client
- Large documents: 100k+ characters

### Performance Tests
- Rope operations < 5ms
- Server broadcast P95 < 50ms
- Memory leak detection after 1000+ ops
- 60 FPS UI responsiveness

## References

- [Operational Transformation Paper](https://dl.acm.org/doi/10.1145/215585.215706)
- [Rope Data Structure](https://en.wikipedia.org/wiki/Rope_(data_structure))
- [Fenwick Tree (BIT)](https://en.wikipedia.org/wiki/Fenwick_tree)
- [Interval Tree](https://en.wikipedia.org/wiki/Interval_tree)
- [CodeMirror 6 Documentation](https://codemirror.net/docs/)

import { Rope } from '../src/rope';

describe('Rope Data Structure', () => {
  test('Create empty rope', () => {
    const rope = new Rope();
    expect(rope.length()).toBe(0);
    expect(rope.toString()).toBe('');
  });

  test('Create rope with initial text', () => {
    const rope = new Rope('Hello World');
    expect(rope.length()).toBe(11);
    expect(rope.toString()).toBe('Hello World');
  });

  test('Insert at position 0', () => {
    const rope = new Rope('World');
    rope.insert(0, 'Hello ');
    expect(rope.toString()).toBe('Hello World');
    expect(rope.length()).toBe(11);
  });

  test('Insert at middle position', () => {
    const rope = new Rope('Hello World');
    rope.insert(6, 'Beautiful ');
    expect(rope.toString()).toBe('Hello Beautiful World');
  });

  test('Insert at end position', () => {
    const rope = new Rope('Hello');
    rope.insert(5, ' World');
    expect(rope.toString()).toBe('Hello World');
  });

  test('Delete at start', () => {
    const rope = new Rope('Hello World');
    rope.delete(0, 6);
    expect(rope.toString()).toBe('World');
  });

  test('Delete at middle', () => {
    const rope = new Rope('Hello Beautiful World');
    rope.delete(6, 10);
    expect(rope.toString()).toBe('Hello World');
  });

  test('Delete at end', () => {
    const rope = new Rope('Hello World');
    rope.delete(5, 6);
    expect(rope.toString()).toBe('Hello');
  });

  test('charAt for all positions', () => {
    const rope = new Rope('Hello');
    expect(rope.charAt(0)).toBe('H');
    expect(rope.charAt(1)).toBe('e');
    expect(rope.charAt(4)).toBe('o');
  });

  test('substring edge cases', () => {
    const rope = new Rope('Hello World');
    expect(rope.substring(0, 5)).toBe('Hello');
    expect(rope.substring(6, 11)).toBe('World');
    expect(rope.substring(0, 11)).toBe('Hello World');
  });

  test('Multiple insertions maintain structure', () => {
    const rope = new Rope('');
    rope.insert(0, 'a');
    rope.insert(1, 'b');
    rope.insert(2, 'c');
    rope.insert(3, 'd');
    rope.insert(4, 'e');
    expect(rope.toString()).toBe('abcde');
  });

  test('Multiple deletions maintain structure', () => {
    const rope = new Rope('abcdefgh');
    rope.delete(6, 2);  // Remove 'gh'
    rope.delete(4, 2);  // Remove 'ef'
    expect(rope.toString()).toBe('abcd');
  });

  test('Mixed operations', () => {
    const rope = new Rope('Hello');
    rope.insert(5, ' ');
    rope.insert(6, 'World');
    rope.delete(0, 6);
    expect(rope.toString()).toBe('World');
  });

  test('Handle Unicode and emoji', () => {
    const rope = new Rope('Hello 🌍');
    expect(rope.toString()).toBe('Hello 🌍');
    rope.insert(6, '👋 ');
    expect(rope.toString()).toContain('👋');
  });

  test('Large document handling', () => {
    const text = 'a'.repeat(1000);
    const rope = new Rope(text);
    expect(rope.length()).toBe(1000);
    rope.insert(500, 'X');
    expect(rope.length()).toBe(1001);
  });
});

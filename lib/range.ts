class RangeIterator {
  from: number;
  to: number;
  current: number;
  constructor(from: number, to: number) {
    this.from = from;
    this.to = to;
    this.current = from;
  }

  [Symbol.iterator](): RangeIterator {
    this.current = this.from;
    return this;
  }

  next(): { done: true } | { done: false; value: number } {
    if (this.current <= this.to) {
      return { done: false, value: this.current++ };
    }
    return { done: true };
  }
}

export function range(a: number, b?: number): RangeIterator {
  if (b === undefined) {
    return new RangeIterator(0, a);
  }
  return new RangeIterator(a, b);
}

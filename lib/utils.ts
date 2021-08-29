/**
 * Allow exhaustive checking of case statements, by throwing an UnhandledCaseError
 * in the default branch.
 */
export class UnhandledCaseError extends Error {
  constructor(value: never, typeName: string) {
    super(`There was an unhandled case for "${typeName}": ${value}`);
    this.name = "UnhandledCaseError";
  }
}

/**
 * Ensure some T exists when the type systems knows it can be null or undefined.
 */
export function ensureExists<T>(
  item: T | null | undefined,
  message = "an item"
): T {
  if (item === null) {
    throw new Error(message || "Expected ${name} to exist, and it was null.");
  }
  if (item === undefined) {
    throw new Error(
      message || "Expected ${name} to exist, and it was undefined."
    );
  }
  return item;
}

/**
 * Fill an array with values.
 */
export function fill<T>(size: number, fn: (i: number) => T): Array<T> {
  const array = Array(size);
  for (let i = 0; i < size; i++) {
    array[i] = fn(i);
  }
  return array;
}

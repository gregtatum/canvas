export type quat = [number, number, number, number] | Float32Array;

// prettier-ignore
export type quat2 =
    | [number, number, number, number,
      number, number, number, number]
    | Float32Array;

// prettier-ignore
export type ReadonlyMat2 =
    | readonly [
        number, number,
        number, number
      ]
    | Float32Array;

// prettier-ignore
export type ReadonlyMat2d =
    | readonly [
        number, number,
        number, number,
        number, number
      ]
    | Float32Array;

// prettier-ignore
export type ReadonlyMat3 =
    | readonly [
        number, number, number,
        number, number, number,
        number, number, number
      ]
    | Float32Array;

// prettier-ignore
export type ReadonlyMat4 =
    | readonly [
        number, number, number, number,
        number, number, number, number,
        number, number, number, number,
        number, number, number, number
      ]
    | Float32Array;

export type ReadonlyQuat =
  | readonly [number, number, number, number]
  | Float32Array;

export type ReadonlyQuat2 =
  | readonly [number, number, number, number, number, number, number, number]
  | Float32Array;

export type ReadonlyVec2 = readonly [number, number] | Float32Array;
export type ReadonlyVec3 = readonly [number, number, number] | Float32Array;
export type ReadonlyVec4 =
  | readonly [number, number, number, number]
  | Float32Array;

export namespace glMatrix {
  /**
   * Sets the type of array used when creating new vectors and matrices
   *
   * @param {Float32ArrayConstructor | ArrayConstructor} type Array type, such as Float32Array or Array
   */
  export function setMatrixArrayType(
    type: ArrayConstructor | Float32ArrayConstructor
  ): void;
  /**
   * Convert Degree To Radian
   *
   * @param {Number} a Angle in Degrees
   */
  export function toRadian(a: number): number;
  /**
   * Tests whether or not the arguments have approximately the same value, within an absolute
   * or relative tolerance of glMatrix.EPSILON (an absolute tolerance is used for values less
   * than or equal to 1.0, and a relative tolerance is used for larger values)
   *
   * @param {Number} a The first number to test.
   * @param {Number} b The second number to test.
   * @returns {Boolean} True if the numbers are approximately equal, false otherwise.
   */
  export function equals(a: number, b: number): boolean;
  /**
   * Common utilities
   * @module glMatrix
   */
  export const EPSILON: 0.000001;
  export let ARRAY_TYPE: ArrayConstructor | Float32ArrayConstructor;
  export const RANDOM: () => number;
}
export namespace mat2 {
  /**
   * 2x2 Matrix
   * @module mat2
   */
  /**
   * Creates a new identity MatrixTuple2x2
   *
   * @returns {MatrixTuple2x2} a new 2x2 matrix
   */
  export function create(): MatrixTuple2x2;
  /**
   * Creates a new MatrixTuple2x2 initialized with values from an existing matrix
   *
   * @param {ReadonlyMat2} a matrix to clone
   * @returns {MatrixTuple2x2} a new 2x2 matrix
   */
  export function clone(a: ReadonlyMat2): MatrixTuple2x2;
  /**
   * Copy the values from one MatrixTuple2x2 to another
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the source matrix
   * @returns {MatrixTuple2x2} out
   */
  export function copy(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Set a MatrixTuple2x2 to the identity matrix
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @returns {MatrixTuple2x2} out
   */
  export function identity(out: MatrixTuple2x2 | []): MatrixTuple2x2;
  /**
   * Create a new MatrixTuple2x2 with the given values
   *
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m10 Component in column 1, row 0 position (index 2)
   * @param {Number} m11 Component in column 1, row 1 position (index 3)
   * @returns {MatrixTuple2x2} out A new 2x2 matrix
   */
  export function fromValues(
    m00: number,
    m01: number,
    m10: number,
    m11: number
  ): MatrixTuple2x2;
  /**
   * Set the components of a MatrixTuple2x2 to the given values
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m10 Component in column 1, row 0 position (index 2)
   * @param {Number} m11 Component in column 1, row 1 position (index 3)
   * @returns {MatrixTuple2x2} out
   */
  export function set(
    out: MatrixTuple2x2 | [],
    m00: number,
    m01: number,
    m10: number,
    m11: number
  ): MatrixTuple2x2;
  /**
   * Transpose the values of a MatrixTuple2x2
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the source matrix
   * @returns {MatrixTuple2x2} out
   */
  export function transpose(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Inverts a MatrixTuple2x2
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the source matrix
   * @returns {MatrixTuple2x2} out
   */
  export function invert(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Calculates the adjugate of a MatrixTuple2x2
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the source matrix
   * @returns {MatrixTuple2x2} out
   */
  export function adjoint(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Calculates the determinant of a MatrixTuple2x2
   *
   * @param {ReadonlyMat2} a the source matrix
   * @returns {Number} determinant of a
   */
  export function determinant(a: ReadonlyMat2): number;
  /**
   * Multiplies two MatrixTuple2x2's
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @returns {MatrixTuple2x2} out
   */
  export function multiply(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Rotates a MatrixTuple2x2 by the given angle
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple2x2} out
   */
  export function rotate(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    rad: number
  ): MatrixTuple2x2;
  /**
   * Scales the MatrixTuple2x2 by the dimensions in the given Tuple2
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the matrix to rotate
   * @param {ReadonlyVec2} v the Tuple2 to scale the matrix by
   * @returns {MatrixTuple2x2} out
   **/
  export function scale(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    v: ReadonlyVec2
  ): MatrixTuple2x2;
  /**
   * Creates a matrix from a given angle
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple2x2.identity(dest);
   *     MatrixTuple2x2.rotate(dest, dest, rad);
   *
   * @param {MatrixTuple2x2} out MatrixTuple2x2 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple2x2} out
   */
  export function fromRotation(
    out: MatrixTuple2x2 | [],
    rad: number
  ): MatrixTuple2x2;
  /**
   * Creates a matrix from a vector scaling
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple2x2.identity(dest);
   *     MatrixTuple2x2.scale(dest, dest, vec);
   *
   * @param {MatrixTuple2x2} out MatrixTuple2x2 receiving operation result
   * @param {ReadonlyVec2} v Scaling vector
   * @returns {MatrixTuple2x2} out
   */
  export function fromScaling(
    out: MatrixTuple2x2 | [],
    v: ReadonlyVec2
  ): MatrixTuple2x2;
  /**
   * Returns a string representation of a MatrixTuple2x2
   *
   * @param {ReadonlyMat2} a matrix to represent as a string
   * @returns {String} string representation of the matrix
   */
  export function str(a: ReadonlyMat2): string;
  /**
   * Returns Frobenius norm of a MatrixTuple2x2
   *
   * @param {ReadonlyMat2} a the matrix to calculate Frobenius norm of
   * @returns {Number} Frobenius norm
   */
  export function frob(a: ReadonlyMat2): number;
  /**
   * Returns L, D and U matrices (Lower triangular, Diagonal and Upper triangular) by factorizing the input matrix
   * @param {ReadonlyMat2} L the lower triangular matrix
   * @param {ReadonlyMat2} D the diagonal matrix
   * @param {ReadonlyMat2} U the upper triangular matrix
   * @param {ReadonlyMat2} a the input matrix to factorize
   */
  export function LDU(
    L: ReadonlyMat2,
    D: ReadonlyMat2,
    U: ReadonlyMat2,
    a: ReadonlyMat2
  ): ReadonlyMat2[];
  /**
   * Adds two MatrixTuple2x2's
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @returns {MatrixTuple2x2} out
   */
  export function add(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @returns {MatrixTuple2x2} out
   */
  export function subtract(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyMat2} a The first matrix.
   * @param {ReadonlyMat2} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyMat2, b: ReadonlyMat2): boolean;
  /**
   * Returns whether or not the matrices have approximately the same elements in the same position.
   *
   * @param {ReadonlyMat2} a The first matrix.
   * @param {ReadonlyMat2} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function equals(a: ReadonlyMat2, b: ReadonlyMat2): boolean;
  /**
   * Multiply each element of the matrix by a scalar.
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the matrix to scale
   * @param {Number} b amount to scale the matrix's elements by
   * @returns {MatrixTuple2x2} out
   */
  export function multiplyScalar(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: number
  ): MatrixTuple2x2;
  /**
   * Adds two MatrixTuple2x2's after multiplying each element of the second operand by a scalar value.
   *
   * @param {MatrixTuple2x2} out the receiving vector
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @param {Number} scale the amount to scale b's elements by before adding
   * @returns {MatrixTuple2x2} out
   */
  export function multiplyScalarAndAdd(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2,
    scale: number
  ): MatrixTuple2x2;
  /**
   * Multiplies two MatrixTuple2x2's
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @returns {MatrixTuple2x2} out
   */
  export function mul(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2
  ): MatrixTuple2x2;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple2x2} out the receiving matrix
   * @param {ReadonlyMat2} a the first operand
   * @param {ReadonlyMat2} b the second operand
   * @returns {MatrixTuple2x2} out
   */
  export function sub(
    out: MatrixTuple2x2 | [],
    a: ReadonlyMat2,
    b: ReadonlyMat2
  ): MatrixTuple2x2;
}
export namespace mat2d {
  /**
   * 2x3 Matrix
   * @module mat2d
   * @description
   * A MatrixTuple2x3 contains six elements defined as:
   * <pre>
   * [a, b,
   *  c, d,
   *  tx, ty]
   * </pre>
   * This is a short form for the 3x3 matrix:
   * <pre>
   * [a, b, 0,
   *  c, d, 0,
   *  tx, ty, 1]
   * </pre>
   * The last column is ignored so the array is shorter and operations are faster.
   */
  /**
   * Creates a new identity MatrixTuple2x3
   *
   * @returns {MatrixTuple2x3} a new 2x3 matrix
   */
  export function create(): MatrixTuple2x3;
  /**
   * Creates a new MatrixTuple2x3 initialized with values from an existing matrix
   *
   * @param {ReadonlyMat2d} a matrix to clone
   * @returns {MatrixTuple2x3} a new 2x3 matrix
   */
  export function clone(a: ReadonlyMat2d): MatrixTuple2x3;
  /**
   * Copy the values from one MatrixTuple2x3 to another
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the source matrix
   * @returns {MatrixTuple2x3} out
   */
  export function copy(out: MatrixTuple2x3, a: ReadonlyMat2d): MatrixTuple2x3;
  /**
   * Set a MatrixTuple2x3 to the identity matrix
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @returns {MatrixTuple2x3} out
   */
  export function identity(out: MatrixTuple2x3): MatrixTuple2x3;
  /**
   * Create a new MatrixTuple2x3 with the given values
   *
   * @param {Number} a Component A (index 0)
   * @param {Number} b Component B (index 1)
   * @param {Number} c Component C (index 2)
   * @param {Number} d Component D (index 3)
   * @param {Number} tx Component TX (index 4)
   * @param {Number} ty Component TY (index 5)
   * @returns {MatrixTuple2x3} A new MatrixTuple2x3
   */
  export function fromValues(
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number
  ): MatrixTuple2x3;
  /**
   * Set the components of a MatrixTuple2x3 to the given values
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {Number} a Component A (index 0)
   * @param {Number} b Component B (index 1)
   * @param {Number} c Component C (index 2)
   * @param {Number} d Component D (index 3)
   * @param {Number} tx Component TX (index 4)
   * @param {Number} ty Component TY (index 5)
   * @returns {MatrixTuple2x3} out
   */
  export function set(
    out: MatrixTuple2x3,
    a: number,
    b: number,
    c: number,
    d: number,
    tx: number,
    ty: number
  ): MatrixTuple2x3;
  /**
   * Inverts a MatrixTuple2x3
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the source matrix
   * @returns {MatrixTuple2x3} out
   */
  export function invert(out: MatrixTuple2x3, a: ReadonlyMat2d): MatrixTuple2x3;
  /**
   * Calculates the determinant of a MatrixTuple2x3
   *
   * @param {ReadonlyMat2d} a the source matrix
   * @returns {Number} determinant of a
   */
  export function determinant(a: ReadonlyMat2d): number;
  /**
   * Multiplies two MatrixTuple2x3's
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @returns {MatrixTuple2x3} out
   */
  export function multiply(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d
  ): MatrixTuple2x3;
  /**
   * Rotates a MatrixTuple2x3 by the given angle
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple2x3} out
   */
  export function rotate(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    rad: number
  ): MatrixTuple2x3;
  /**
   * Scales the MatrixTuple2x3 by the dimensions in the given vec2
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the matrix to translate
   * @param {ReadonlyVec2} v the vec2 to scale the matrix by
   * @returns {MatrixTuple2x3} out
   **/
  export function scale(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    v: ReadonlyVec2
  ): MatrixTuple2x3;
  /**
   * Translates the MatrixTuple2x3 by the dimensions in the given vec2
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the matrix to translate
   * @param {ReadonlyVec2} v the vec2 to translate the matrix by
   * @returns {MatrixTuple2x3} out
   **/
  export function translate(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    v: ReadonlyVec2
  ): MatrixTuple2x3;
  /**
   * Creates a matrix from a given angle
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple2x3.identity(dest);
   *     MatrixTuple2x3.rotate(dest, dest, rad);
   *
   * @param {MatrixTuple2x3} out MatrixTuple2x3 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple2x3} out
   */
  export function fromRotation(
    out: MatrixTuple2x3,
    rad: number
  ): MatrixTuple2x3;
  /**
   * Creates a matrix from a vector scaling
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple2x3.identity(dest);
   *     MatrixTuple2x3.scale(dest, dest, vec);
   *
   * @param {MatrixTuple2x3} out MatrixTuple2x3 receiving operation result
   * @param {ReadonlyVec2} v Scaling vector
   * @returns {MatrixTuple2x3} out
   */
  export function fromScaling(
    out: MatrixTuple2x3,
    v: ReadonlyVec2
  ): MatrixTuple2x3;
  /**
   * Creates a matrix from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple2x3.identity(dest);
   *     MatrixTuple2x3.translate(dest, dest, vec);
   *
   * @param {MatrixTuple2x3} out MatrixTuple2x3 receiving operation result
   * @param {ReadonlyVec2} v Translation vector
   * @returns {MatrixTuple2x3} out
   */
  export function fromTranslation(
    out: MatrixTuple2x3,
    v: ReadonlyVec2
  ): MatrixTuple2x3;
  /**
   * Returns a string representation of a MatrixTuple2x3
   *
   * @param {ReadonlyMat2d} a matrix to represent as a string
   * @returns {String} string representation of the matrix
   */
  export function str(a: ReadonlyMat2d): string;
  /**
   * Returns Frobenius norm of a MatrixTuple2x3
   *
   * @param {ReadonlyMat2d} a the matrix to calculate Frobenius norm of
   * @returns {Number} Frobenius norm
   */
  export function frob(a: ReadonlyMat2d): number;
  /**
   * Adds two MatrixTuple2x3's
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @returns {MatrixTuple2x3} out
   */
  export function add(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d
  ): MatrixTuple2x3;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @returns {MatrixTuple2x3} out
   */
  export function subtract(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d
  ): MatrixTuple2x3;
  /**
   * Multiply each element of the matrix by a scalar.
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the matrix to scale
   * @param {Number} b amount to scale the matrix's elements by
   * @returns {MatrixTuple2x3} out
   */
  export function multiplyScalar(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: number
  ): MatrixTuple2x3;
  /**
   * Adds two MatrixTuple2x3's after multiplying each element of the second operand by a scalar value.
   *
   * @param {MatrixTuple2x3} out the receiving vector
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @param {Number} scale the amount to scale b's elements by before adding
   * @returns {MatrixTuple2x3} out
   */
  export function multiplyScalarAndAdd(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d,
    scale: number
  ): MatrixTuple2x3;
  /**
   * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyMat2d} a The first matrix.
   * @param {ReadonlyMat2d} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyMat2d, b: ReadonlyMat2d): boolean;
  /**
   * Returns whether or not the matrices have approximately the same elements in the same position.
   *
   * @param {ReadonlyMat2d} a The first matrix.
   * @param {ReadonlyMat2d} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function equals(a: ReadonlyMat2d, b: ReadonlyMat2d): boolean;
  /**
   * Multiplies two MatrixTuple2x3's
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @returns {MatrixTuple2x3} out
   */
  export function mul(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d
  ): MatrixTuple2x3;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple2x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the first operand
   * @param {ReadonlyMat2d} b the second operand
   * @returns {MatrixTuple2x3} out
   */
  export function sub(
    out: MatrixTuple2x3,
    a: ReadonlyMat2d,
    b: ReadonlyMat2d
  ): MatrixTuple2x3;
}
export namespace mat3 {
  /**
   * 3x3 Matrix
   * @module mat3
   */
  /**
   * Creates a new identity MatrixTuple3x3
   *
   * @returns {MatrixTuple3x3} a new 3x3 matrix
   */
  export function create(): MatrixTuple3x3;
  /**
   * Copies the upper-left 3x3 values into the given MatrixTuple3x3.
   *
   * @param {MatrixTuple3x3} out the receiving 3x3 matrix
   * @param {ReadonlyMat4} a   the source 4x4 matrix
   * @returns {MatrixTuple3x3} out
   */
  export function fromMat4(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat4
  ): MatrixTuple3x3;
  /**
   * Creates a new MatrixTuple3x3 initialized with values from an existing matrix
   *
   * @param {ReadonlyMat3} a matrix to clone
   * @returns {MatrixTuple3x3} a new 3x3 matrix
   */
  export function clone(a: ReadonlyMat3): MatrixTuple3x3;
  /**
   * Copy the values from one MatrixTuple3x3 to another
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the source matrix
   * @returns {MatrixTuple3x3} out
   */
  export function copy(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Create a new MatrixTuple3x3 with the given values
   *
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m02 Component in column 0, row 2 position (index 2)
   * @param {Number} m10 Component in column 1, row 0 position (index 3)
   * @param {Number} m11 Component in column 1, row 1 position (index 4)
   * @param {Number} m12 Component in column 1, row 2 position (index 5)
   * @param {Number} m20 Component in column 2, row 0 position (index 6)
   * @param {Number} m21 Component in column 2, row 1 position (index 7)
   * @param {Number} m22 Component in column 2, row 2 position (index 8)
   * @returns {MatrixTuple3x3} A new MatrixTuple3x3
   */
  export function fromValues(
    m00: number,
    m01: number,
    m02: number,
    m10: number,
    m11: number,
    m12: number,
    m20: number,
    m21: number,
    m22: number
  ): MatrixTuple3x3;
  /**
   * Set the components of a MatrixTuple3x3 to the given values
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m02 Component in column 0, row 2 position (index 2)
   * @param {Number} m10 Component in column 1, row 0 position (index 3)
   * @param {Number} m11 Component in column 1, row 1 position (index 4)
   * @param {Number} m12 Component in column 1, row 2 position (index 5)
   * @param {Number} m20 Component in column 2, row 0 position (index 6)
   * @param {Number} m21 Component in column 2, row 1 position (index 7)
   * @param {Number} m22 Component in column 2, row 2 position (index 8)
   * @returns {MatrixTuple3x3} out
   */
  export function set(
    out: MatrixTuple3x3 | [],
    m00: number,
    m01: number,
    m02: number,
    m10: number,
    m11: number,
    m12: number,
    m20: number,
    m21: number,
    m22: number
  ): MatrixTuple3x3;
  /**
   * Set a MatrixTuple3x3 to the identity matrix
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @returns {MatrixTuple3x3} out
   */
  export function identity(out: MatrixTuple3x3 | []): MatrixTuple3x3;
  /**
   * Transpose the values of a MatrixTuple3x3
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the source matrix
   * @returns {MatrixTuple3x3} out
   */
  export function transpose(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Inverts a MatrixTuple3x3
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the source matrix
   * @returns {MatrixTuple3x3} out
   */
  export function invert(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Calculates the adjugate of a MatrixTuple3x3
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the source matrix
   * @returns {MatrixTuple3x3} out
   */
  export function adjoint(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Calculates the determinant of a MatrixTuple3x3
   *
   * @param {ReadonlyMat3} a the source matrix
   * @returns {Number} determinant of a
   */
  export function determinant(a: ReadonlyMat3): number;
  /**
   * Multiplies two MatrixTuple3x3's
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @returns {MatrixTuple3x3} out
   */
  export function multiply(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Translate a MatrixTuple3x3 by the given vector
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the matrix to translate
   * @param {ReadonlyVec2} v vector to translate by
   * @returns {MatrixTuple3x3} out
   */
  export function translate(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    v: ReadonlyVec2
  ): MatrixTuple3x3;
  /**
   * Rotates a MatrixTuple3x3 by the given angle
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple3x3} out
   */
  export function rotate(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    rad: number
  ): MatrixTuple3x3;
  /**
   * Scales the MatrixTuple3x3 by the dimensions in the given Tuple2
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the matrix to rotate
   * @param {ReadonlyVec2} v the Tuple2 to scale the matrix by
   * @returns {MatrixTuple3x3} out
   **/
  export function scale(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    v: ReadonlyVec2
  ): MatrixTuple3x3;
  /**
   * Creates a matrix from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple3x3.identity(dest);
   *     MatrixTuple3x3.translate(dest, dest, vec);
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 receiving operation result
   * @param {ReadonlyVec2} v Translation vector
   * @returns {MatrixTuple3x3} out
   */
  export function fromTranslation(
    out: MatrixTuple3x3 | [],
    v: ReadonlyVec2
  ): MatrixTuple3x3;
  /**
   * Creates a matrix from a given angle
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple3x3.identity(dest);
   *     MatrixTuple3x3.rotate(dest, dest, rad);
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple3x3} out
   */
  export function fromRotation(
    out: MatrixTuple3x3 | [],
    rad: number
  ): MatrixTuple3x3;
  /**
   * Creates a matrix from a vector scaling
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple3x3.identity(dest);
   *     MatrixTuple3x3.scale(dest, dest, vec);
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 receiving operation result
   * @param {ReadonlyVec2} v Scaling vector
   * @returns {MatrixTuple3x3} out
   */
  export function fromScaling(
    out: MatrixTuple3x3 | [],
    v: ReadonlyVec2
  ): MatrixTuple3x3;
  /**
   * Copies the values from a MatrixTuple2x3 into a MatrixTuple3x3
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat2d} a the matrix to copy
   * @returns {MatrixTuple3x3} out
   **/
  export function fromMat2d(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat2d
  ): MatrixTuple3x3;
  /**
   * Calculates a 3x3 matrix from the given quaternion
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 receiving operation result
   * @param {ReadonlyQuat} q Quaternion to create matrix from
   *
   * @returns {MatrixTuple3x3} out
   */
  export function fromQuat(
    out: MatrixTuple3x3 | [],
    q: ReadonlyQuat
  ): MatrixTuple3x3;
  /**
   * Calculates a 3x3 normal matrix (transpose inverse) from the 4x4 matrix
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 receiving operation result
   * @param {ReadonlyMat4} a Mat4 to derive the normal matrix from
   *
   * @returns {MatrixTuple3x3} out
   */
  export function normalFromMat4(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat4
  ): MatrixTuple3x3;
  /**
   * Generates a 2D projection matrix with the given bounds
   *
   * @param {MatrixTuple3x3} out MatrixTuple3x3 frustum matrix will be written into
   * @param {number} width Width of your gl context
   * @param {number} height Height of gl context
   * @returns {MatrixTuple3x3} out
   */
  export function projection(
    out: MatrixTuple3x3 | [],
    width: number,
    height: number
  ): MatrixTuple3x3;
  /**
   * Returns a string representation of a MatrixTuple3x3
   *
   * @param {ReadonlyMat3} a matrix to represent as a string
   * @returns {String} string representation of the matrix
   */
  export function str(a: ReadonlyMat3): string;
  /**
   * Returns Frobenius norm of a MatrixTuple3x3
   *
   * @param {ReadonlyMat3} a the matrix to calculate Frobenius norm of
   * @returns {Number} Frobenius norm
   */
  export function frob(a: ReadonlyMat3): number;
  /**
   * Adds two MatrixTuple3x3's
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @returns {MatrixTuple3x3} out
   */
  export function add(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @returns {MatrixTuple3x3} out
   */
  export function subtract(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Multiply each element of the matrix by a scalar.
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the matrix to scale
   * @param {Number} b amount to scale the matrix's elements by
   * @returns {MatrixTuple3x3} out
   */
  export function multiplyScalar(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: number
  ): MatrixTuple3x3;
  /**
   * Adds two MatrixTuple3x3's after multiplying each element of the second operand by a scalar value.
   *
   * @param {MatrixTuple3x3} out the receiving vector
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @param {Number} scale the amount to scale b's elements by before adding
   * @returns {MatrixTuple3x3} out
   */
  export function multiplyScalarAndAdd(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3,
    scale: number
  ): MatrixTuple3x3;
  /**
   * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyMat3} a The first matrix.
   * @param {ReadonlyMat3} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyMat3, b: ReadonlyMat3): boolean;
  /**
   * Returns whether or not the matrices have approximately the same elements in the same position.
   *
   * @param {ReadonlyMat3} a The first matrix.
   * @param {ReadonlyMat3} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function equals(a: ReadonlyMat3, b: ReadonlyMat3): boolean;
  /**
   * Multiplies two MatrixTuple3x3's
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @returns {MatrixTuple3x3} out
   */
  export function mul(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3
  ): MatrixTuple3x3;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple3x3} out the receiving matrix
   * @param {ReadonlyMat3} a the first operand
   * @param {ReadonlyMat3} b the second operand
   * @returns {MatrixTuple3x3} out
   */
  export function sub(
    out: MatrixTuple3x3 | [],
    a: ReadonlyMat3,
    b: ReadonlyMat3
  ): MatrixTuple3x3;
}
export namespace mat4 {
  /**
   * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
   * @module mat4
   */
  /**
   * Creates a new identity MatrixTuple4x4
   *
   * @returns {MatrixTuple4x4} a new 4x4 matrix
   */
  export function create(): MatrixTuple4x4;
  /**
   * Creates a new MatrixTuple4x4 initialized with values from an existing matrix
   *
   * @param {ReadonlyMat4} a matrix to clone
   * @returns {MatrixTuple4x4} a new 4x4 matrix
   */
  export function clone(a: ReadonlyMat4): MatrixTuple4x4;
  /**
   * Copy the values from one MatrixTuple4x4 to another
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the source matrix
   * @returns {MatrixTuple4x4} out
   */
  export function copy(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Create a new MatrixTuple4x4 with the given values
   *
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m02 Component in column 0, row 2 position (index 2)
   * @param {Number} m03 Component in column 0, row 3 position (index 3)
   * @param {Number} m10 Component in column 1, row 0 position (index 4)
   * @param {Number} m11 Component in column 1, row 1 position (index 5)
   * @param {Number} m12 Component in column 1, row 2 position (index 6)
   * @param {Number} m13 Component in column 1, row 3 position (index 7)
   * @param {Number} m20 Component in column 2, row 0 position (index 8)
   * @param {Number} m21 Component in column 2, row 1 position (index 9)
   * @param {Number} m22 Component in column 2, row 2 position (index 10)
   * @param {Number} m23 Component in column 2, row 3 position (index 11)
   * @param {Number} m30 Component in column 3, row 0 position (index 12)
   * @param {Number} m31 Component in column 3, row 1 position (index 13)
   * @param {Number} m32 Component in column 3, row 2 position (index 14)
   * @param {Number} m33 Component in column 3, row 3 position (index 15)
   * @returns {MatrixTuple4x4} A new MatrixTuple4x4
   */
  export function fromValues(
    m00: number,
    m01: number,
    m02: number,
    m03: number,
    m10: number,
    m11: number,
    m12: number,
    m13: number,
    m20: number,
    m21: number,
    m22: number,
    m23: number,
    m30: number,
    m31: number,
    m32: number,
    m33: number
  ): MatrixTuple4x4;
  /**
   * Set the components of a MatrixTuple4x4 to the given values
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {Number} m00 Component in column 0, row 0 position (index 0)
   * @param {Number} m01 Component in column 0, row 1 position (index 1)
   * @param {Number} m02 Component in column 0, row 2 position (index 2)
   * @param {Number} m03 Component in column 0, row 3 position (index 3)
   * @param {Number} m10 Component in column 1, row 0 position (index 4)
   * @param {Number} m11 Component in column 1, row 1 position (index 5)
   * @param {Number} m12 Component in column 1, row 2 position (index 6)
   * @param {Number} m13 Component in column 1, row 3 position (index 7)
   * @param {Number} m20 Component in column 2, row 0 position (index 8)
   * @param {Number} m21 Component in column 2, row 1 position (index 9)
   * @param {Number} m22 Component in column 2, row 2 position (index 10)
   * @param {Number} m23 Component in column 2, row 3 position (index 11)
   * @param {Number} m30 Component in column 3, row 0 position (index 12)
   * @param {Number} m31 Component in column 3, row 1 position (index 13)
   * @param {Number} m32 Component in column 3, row 2 position (index 14)
   * @param {Number} m33 Component in column 3, row 3 position (index 15)
   * @returns {MatrixTuple4x4} out
   */
  export function set(
    out: MatrixTuple4x4 | [],
    m00: number,
    m01: number,
    m02: number,
    m03: number,
    m10: number,
    m11: number,
    m12: number,
    m13: number,
    m20: number,
    m21: number,
    m22: number,
    m23: number,
    m30: number,
    m31: number,
    m32: number,
    m33: number
  ): MatrixTuple4x4;
  /**
   * Set a MatrixTuple4x4 to the identity matrix
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @returns {MatrixTuple4x4} out
   */
  export function identity(out: MatrixTuple4x4 | []): MatrixTuple4x4;
  /**
   * Transpose the values of a MatrixTuple4x4
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the source matrix
   * @returns {MatrixTuple4x4} out
   */
  export function transpose(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Inverts a MatrixTuple4x4
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the source matrix
   * @returns {MatrixTuple4x4} out
   */
  export function invert(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Calculates the adjugate of a MatrixTuple4x4
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the source matrix
   * @returns {MatrixTuple4x4} out
   */
  export function adjoint(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Calculates the determinant of a MatrixTuple4x4
   *
   * @param {ReadonlyMat4} a the source matrix
   * @returns {Number} determinant of a
   */
  export function determinant(a: ReadonlyMat4): number;
  /**
   * Multiplies two mat4s
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @returns {MatrixTuple4x4} out
   */
  export function multiply(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Translate a MatrixTuple4x4 by the given vector
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to translate
   * @param {ReadonlyVec3} v vector to translate by
   * @returns {MatrixTuple4x4} out
   */
  export function translate(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    v: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Scales the MatrixTuple4x4 by the dimensions in the given Tuple3 not using vectorization
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to scale
   * @param {ReadonlyVec3} v the Tuple3 to scale the matrix by
   * @returns {MatrixTuple4x4} out
   **/
  export function scale(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    v: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Rotates a MatrixTuple4x4 by the given angle around the given axis
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @param {ReadonlyVec3} axis the axis to rotate around
   * @returns {MatrixTuple4x4} out
   */
  export function rotate(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    rad: number,
    axis: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Rotates a matrix by the given angle around the X axis
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function rotateX(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    rad: number
  ): MatrixTuple4x4;
  /**
   * Rotates a matrix by the given angle around the Y axis
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function rotateY(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    rad: number
  ): MatrixTuple4x4;
  /**
   * Rotates a matrix by the given angle around the Z axis
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to rotate
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function rotateZ(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    rad: number
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from a vector translation
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.translate(dest, dest, vec);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {ReadonlyVec3} v Translation vector
   * @returns {MatrixTuple4x4} out
   */
  export function fromTranslation(
    out: MatrixTuple4x4 | [],
    v: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from a vector scaling
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.scale(dest, dest, vec);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {ReadonlyVec3} v Scaling vector
   * @returns {MatrixTuple4x4} out
   */
  export function fromScaling(
    out: MatrixTuple4x4 | [],
    v: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from a given angle around a given axis
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.rotate(dest, dest, rad, axis);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @param {ReadonlyVec3} axis the axis to rotate around
   * @returns {MatrixTuple4x4} out
   */
  export function fromRotation(
    out: MatrixTuple4x4 | [],
    rad: number,
    axis: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from the given angle around the X axis
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.rotateX(dest, dest, rad);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function fromXRotation(
    out: MatrixTuple4x4 | [],
    rad: number
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from the given angle around the Y axis
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.rotateY(dest, dest, rad);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function fromYRotation(
    out: MatrixTuple4x4 | [],
    rad: number
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from the given angle around the Z axis
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.rotateZ(dest, dest, rad);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {Number} rad the angle to rotate the matrix by
   * @returns {MatrixTuple4x4} out
   */
  export function fromZRotation(
    out: MatrixTuple4x4 | [],
    rad: number
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from a quaternion rotation and vector translation
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.translate(dest, vec);
   *     let quatMat = MatrixTuple4x4.create();
   *     quat4.toMat4(quat, quatMat);
   *     MatrixTuple4x4.multiply(dest, quatMat);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {quat4} q Rotation quaternion
   * @param {ReadonlyVec3} v Translation vector
   * @returns {MatrixTuple4x4} out
   */
  export function fromRotationTranslation(
    out: MatrixTuple4x4 | [],
    q: any,
    v: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Creates a new MatrixTuple4x4 from a dual quat.
   *
   * @param {MatrixTuple4x4} out Matrix
   * @param {ReadonlyQuat2} a Dual Quaternion
   * @returns {MatrixTuple4x4} MatrixTuple4x4 receiving operation result
   */
  export function fromQuat2(
    out: MatrixTuple4x4 | [],
    a: ReadonlyQuat2
  ): MatrixTuple4x4;
  /**
   * Returns the translation vector component of a transformation
   *  matrix. If a matrix is built with fromRotationTranslation,
   *  the returned vector will be the same as the translation vector
   *  originally supplied.
   * @param  {Tuple3} out Vector to receive translation component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {Tuple3} out
   */
  export function getTranslation(out: Tuple3 | [], mat: ReadonlyMat4): Tuple3;
  /**
   * Returns the scaling factor component of a transformation
   *  matrix. If a matrix is built with fromRotationTranslationScale
   *  with a normalized Quaternion paramter, the returned vector will be
   *  the same as the scaling vector
   *  originally supplied.
   * @param  {Tuple3} out Vector to receive scaling factor component
   * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {Tuple3} out
   */
  export function getScaling(out: Tuple3 | [], mat: ReadonlyMat4): Tuple3;
  /**
   * Returns a quaternion representing the rotational component
   *  of a transformation matrix. If a matrix is built with
   *  fromRotationTranslation, the returned quaternion will be the
   *  same as the quaternion originally supplied.
   * @param {quat} out Quaternion to receive the rotation component
   * @param {ReadonlyMat4} mat Matrix to be decomposed (input)
   * @return {quat} out
   */
  export function getRotation(out: quat, mat: ReadonlyMat4): quat;
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.translate(dest, vec);
   *     let quatMat = MatrixTuple4x4.create();
   *     quat4.toMat4(quat, quatMat);
   *     MatrixTuple4x4.multiply(dest, quatMat);
   *     MatrixTuple4x4.scale(dest, scale)
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {quat4} q Rotation quaternion
   * @param {ReadonlyVec3} v Translation vector
   * @param {ReadonlyVec3} s Scaling vector
   * @returns {MatrixTuple4x4} out
   */
  export function fromRotationTranslationScale(
    out: MatrixTuple4x4 | [],
    q: any,
    v: ReadonlyVec3,
    s: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
   * This is equivalent to (but much faster than):
   *
   *     MatrixTuple4x4.identity(dest);
   *     MatrixTuple4x4.translate(dest, vec);
   *     MatrixTuple4x4.translate(dest, origin);
   *     let quatMat = MatrixTuple4x4.create();
   *     quat4.toMat4(quat, quatMat);
   *     MatrixTuple4x4.multiply(dest, quatMat);
   *     MatrixTuple4x4.scale(dest, scale)
   *     MatrixTuple4x4.translate(dest, negativeOrigin);
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {quat4} q Rotation quaternion
   * @param {ReadonlyVec3} v Translation vector
   * @param {ReadonlyVec3} s Scaling vector
   * @param {ReadonlyVec3} o The origin vector around which to scale and rotate
   * @returns {MatrixTuple4x4} out
   */
  export function fromRotationTranslationScaleOrigin(
    out: MatrixTuple4x4 | [],
    q: any,
    v: ReadonlyVec3,
    s: ReadonlyVec3,
    o: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Calculates a 4x4 matrix from the given quaternion
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 receiving operation result
   * @param {ReadonlyQuat} q Quaternion to create matrix from
   *
   * @returns {MatrixTuple4x4} out
   */
  export function fromQuat(
    out: MatrixTuple4x4 | [],
    q: ReadonlyQuat
  ): MatrixTuple4x4;
  /**
   * Generates a frustum matrix with the given bounds
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {Number} left Left bound of the frustum
   * @param {Number} right Right bound of the frustum
   * @param {Number} bottom Bottom bound of the frustum
   * @param {Number} top Top bound of the frustum
   * @param {Number} near Near bound of the frustum
   * @param {Number} far Far bound of the frustum
   * @returns {MatrixTuple4x4} out
   */
  export function frustum(
    out: MatrixTuple4x4 | [],
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): MatrixTuple4x4;
  /**
   * Generates a perspective projection matrix with the given bounds.
   * Passing null/undefined/no value for far will generate infinite projection matrix.
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {number} fovy Vertical field of view in radians
   * @param {number} aspect Aspect ratio. typically viewport width/height
   * @param {number} near Near bound of the frustum
   * @param {number} far Far bound of the frustum, can be null or Infinity
   * @returns {MatrixTuple4x4} out
   */
  export function perspective(
    out: MatrixTuple4x4 | [],
    fovy: number,
    aspect: number,
    near: number,
    far: number
  ): MatrixTuple4x4;
  /**
   * Generates a perspective projection matrix with the given field of view.
   * This is primarily useful for generating projection matrices to be used
   * with the still experiemental WebVR API.
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {Object} fov Object containing the following values: upDegrees, downDegrees, leftDegrees, rightDegrees
   * @param {number} near Near bound of the frustum
   * @param {number} far Far bound of the frustum
   * @returns {MatrixTuple4x4} out
   */
  export function perspectiveFromFieldOfView(
    out: MatrixTuple4x4 | [],
    fov: any,
    near: number,
    far: number
  ): MatrixTuple4x4;
  /**
   * Generates a orthogonal projection matrix with the given bounds
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {number} left Left bound of the frustum
   * @param {number} right Right bound of the frustum
   * @param {number} bottom Bottom bound of the frustum
   * @param {number} top Top bound of the frustum
   * @param {number} near Near bound of the frustum
   * @param {number} far Far bound of the frustum
   * @returns {MatrixTuple4x4} out
   */
  export function ortho(
    out: MatrixTuple4x4 | [],
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): MatrixTuple4x4;
  /**
   * Generates a look-at matrix with the given eye position, focal point, and up axis.
   * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {ReadonlyVec3} eye Position of the viewer
   * @param {ReadonlyVec3} center Point the viewer is looking at
   * @param {ReadonlyVec3} up Tuple3 pointing up
   * @returns {MatrixTuple4x4} out
   */
  export function lookAt(
    out: MatrixTuple4x4 | [],
    eye: ReadonlyVec3,
    center: ReadonlyVec3,
    up: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Generates a matrix that makes something look at something else.
   *
   * @param {MatrixTuple4x4} out MatrixTuple4x4 frustum matrix will be written into
   * @param {ReadonlyVec3} eye Position of the viewer
   * @param {ReadonlyVec3} center Point the viewer is looking at
   * @param {ReadonlyVec3} up Tuple3 pointing up
   * @returns {MatrixTuple4x4} out
   */
  export function targetTo(
    out: MatrixTuple4x4 | [],
    eye: ReadonlyVec3,
    target: any,
    up: ReadonlyVec3
  ): MatrixTuple4x4;
  /**
   * Returns a string representation of a MatrixTuple4x4
   *
   * @param {ReadonlyMat4} a matrix to represent as a string
   * @returns {String} string representation of the matrix
   */
  export function str(a: ReadonlyMat4): string;
  /**
   * Returns Frobenius norm of a MatrixTuple4x4
   *
   * @param {ReadonlyMat4} a the matrix to calculate Frobenius norm of
   * @returns {Number} Frobenius norm
   */
  export function frob(a: ReadonlyMat4): number;
  /**
   * Adds two MatrixTuple4x4's
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @returns {MatrixTuple4x4} out
   */
  export function add(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @returns {MatrixTuple4x4} out
   */
  export function subtract(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Multiply each element of the matrix by a scalar.
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the matrix to scale
   * @param {Number} b amount to scale the matrix's elements by
   * @returns {MatrixTuple4x4} out
   */
  export function multiplyScalar(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: number
  ): MatrixTuple4x4;
  /**
   * Adds two MatrixTuple4x4's after multiplying each element of the second operand by a scalar value.
   *
   * @param {MatrixTuple4x4} out the receiving vector
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @param {Number} scale the amount to scale b's elements by before adding
   * @returns {MatrixTuple4x4} out
   */
  export function multiplyScalarAndAdd(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4,
    scale: number
  ): MatrixTuple4x4;
  /**
   * Returns whether or not the matrices have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyMat4} a The first matrix.
   * @param {ReadonlyMat4} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyMat4, b: ReadonlyMat4): boolean;
  /**
   * Returns whether or not the matrices have approximately the same elements in the same position.
   *
   * @param {ReadonlyMat4} a The first matrix.
   * @param {ReadonlyMat4} b The second matrix.
   * @returns {Boolean} True if the matrices are equal, false otherwise.
   */
  export function equals(a: ReadonlyMat4, b: ReadonlyMat4): boolean;
  /**
   * Multiplies two mat4s
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @returns {MatrixTuple4x4} out
   */
  export function mul(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4
  ): MatrixTuple4x4;
  /**
   * Subtracts matrix b from matrix a
   *
   * @param {MatrixTuple4x4} out the receiving matrix
   * @param {ReadonlyMat4} a the first operand
   * @param {ReadonlyMat4} b the second operand
   * @returns {MatrixTuple4x4} out
   */
  export function sub(
    out: MatrixTuple4x4 | [],
    a: ReadonlyMat4,
    b: ReadonlyMat4
  ): MatrixTuple4x4;
}
export namespace vec3 {
  /**
   * 3 Dimensional Vector
   * @module vec3
   */
  /**
   * Creates a new, empty Tuple3
   *
   * @returns {Tuple3} a new 3D vector
   */
  export function create(): Tuple3;
  /**
   * Creates a new Tuple3 initialized with values from an existing vector
   *
   * @param {ReadonlyVec3} a vector to clone
   * @returns {Tuple3} a new 3D vector
   */
  export function clone(a: ReadonlyVec3): Tuple3;
  /**
   * Calculates the length of a Tuple3
   *
   * @param {ReadonlyVec3} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function length(a: ReadonlyVec3): number;
  /**
   * Creates a new Tuple3 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @returns {Tuple3} a new 3D vector
   */
  export function fromValues(x: number, y: number, z: number): Tuple3;
  /**
   * Copy the values from one Tuple3 to another
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the source vector
   * @returns {Tuple3} out
   */
  export function copy(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Set the components of a Tuple3 to the given values
   *
   * @param {Tuple3} out the receiving vector
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @returns {Tuple3} out
   */
  export function set(
    out: Tuple3 | [],
    x: number,
    y: number,
    z: number
  ): Tuple3;
  /**
   * Adds two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function add(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function subtract(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Multiplies two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function multiply(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Divides two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function divide(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Math.ceil the components of a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to ceil
   * @returns {Tuple3} out
   */
  export function ceil(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Math.floor the components of a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to floor
   * @returns {Tuple3} out
   */
  export function floor(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Returns the minimum of two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function min(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Returns the maximum of two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function max(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Math.round the components of a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to round
   * @returns {Tuple3} out
   */
  export function round(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Scales a Tuple3 by a scalar number
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the vector to scale
   * @param {Number} b amount to scale the vector by
   * @returns {Tuple3} out
   */
  export function scale(out: Tuple3 | [], a: ReadonlyVec3, b: number): Tuple3;
  /**
   * Adds two Tuple3's after scaling the second operand by a scalar value
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @param {Number} scale the amount to scale b by before adding
   * @returns {Tuple3} out
   */
  export function scaleAndAdd(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3,
    scale: number
  ): Tuple3;
  /**
   * Calculates the euclidian distance between two Tuple3's
   *
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Number} distance between a and b
   */
  export function distance(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Calculates the squared euclidian distance between two Tuple3's
   *
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function squaredDistance(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Calculates the squared length of a Tuple3
   *
   * @param {ReadonlyVec3} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function squaredLength(a: ReadonlyVec3): number;
  /**
   * Negates the components of a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to negate
   * @returns {Tuple3} out
   */
  export function negate(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Returns the inverse of the components of a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to invert
   * @returns {Tuple3} out
   */
  export function inverse(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Normalize a Tuple3
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a vector to normalize
   * @returns {Tuple3} out
   */
  export function normalize(out: Tuple3 | [], a: ReadonlyVec3): Tuple3;
  /**
   * Calculates the dot product of two Tuple3's
   *
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Number} dot product of a and b
   */
  export function dot(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Computes the cross product of two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function cross(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Performs a linear interpolation between two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {Tuple3} out
   */
  export function lerp(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3,
    t: number
  ): Tuple3;
  /**
   * Performs a hermite interpolation with two control points
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @param {ReadonlyVec3} c the third operand
   * @param {ReadonlyVec3} d the fourth operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {Tuple3} out
   */
  export function hermite(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3,
    c: ReadonlyVec3,
    d: ReadonlyVec3,
    t: number
  ): Tuple3;
  /**
   * Performs a bezier interpolation with two control points
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @param {ReadonlyVec3} c the third operand
   * @param {ReadonlyVec3} d the fourth operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {Tuple3} out
   */
  export function bezier(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3,
    c: ReadonlyVec3,
    d: ReadonlyVec3,
    t: number
  ): Tuple3;
  /**
   * Generates a random vector with the given scale
   *
   * @param {Tuple3} out the receiving vector
   * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
   * @returns {Tuple3} out
   */
  export function random(out: Tuple3 | [], scale?: number): Tuple3;
  /**
   * Transforms the Tuple3 with a MatrixTuple4x4.
   * 4th vector component is implicitly '1'
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the vector to transform
   * @param {ReadonlyMat4} m matrix to transform with
   * @returns {Tuple3} out
   */
  export function transformMat4(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    m: ReadonlyMat4
  ): Tuple3;
  /**
   * Transforms the Tuple3 with a MatrixTuple3x3.
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the vector to transform
   * @param {ReadonlyMat3} m the 3x3 matrix to transform with
   * @returns {Tuple3} out
   */
  export function transformMat3(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    m: ReadonlyMat3
  ): Tuple3;
  /**
   * Transforms the Tuple3 with a quat
   * Can also be used for dual quaternions. (Multiply it with the real part)
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the vector to transform
   * @param {ReadonlyQuat} q quaternion to transform with
   * @returns {Tuple3} out
   */
  export function transformQuat(
    out: Tuple3 | [],
    point: ReadonlyVec3,
    origin: ReadonlyQuat
  ): Tuple3;
  /**
   * Rotate a 3D vector around the x-axis
   * @param {Tuple3} out The receiving Tuple3
   * @param {ReadonlyVec3} a The Tuple3 point to rotate
   * @param {ReadonlyVec3} b The origin of the rotation
   * @param {Number} rad The angle of rotation in radians
   * @returns {Tuple3} out
   */
  export function rotateX(
    out: Tuple3 | [],
    point: ReadonlyVec3,
    origin: ReadonlyVec3,
    rad: number
  ): Tuple3;
  /**
   * Rotate a 3D vector around the y-axis
   * @param {Tuple3} out The receiving Tuple3
   * @param {ReadonlyVec3} a The Tuple3 point to rotate
   * @param {ReadonlyVec3} b The origin of the rotation
   * @param {Number} rad The angle of rotation in radians
   * @returns {Tuple3} out
   */
  export function rotateY(
    out: Tuple3 | [],
    point: ReadonlyVec3,
    origin: ReadonlyVec3,
    rad: number
  ): Tuple3;
  /**
   * Rotate a 3D vector around the z-axis
   * @param {Tuple3} out The receiving Tuple3
   * @param {ReadonlyVec3} a The Tuple3 point to rotate
   * @param {ReadonlyVec3} b The origin of the rotation
   * @param {Number} rad The angle of rotation in radians
   * @returns {Tuple3} out
   */
  export function rotateZ(
    out: Tuple3 | [],
    point: ReadonlyVec3,
    origin: ReadonlyVec3,
    rad: number
  ): Tuple3;
  /**
   * Get the angle between two 3D vectors
   * @param {ReadonlyVec3} a The first operand
   * @param {ReadonlyVec3} b The second operand
   * @returns {Number} The angle in radians
   */
  export function angle(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Set the components of a Tuple3 to zero
   *
   * @param {Tuple3} out the receiving vector
   * @returns {Tuple3} out
   */
  export function zero(out: Tuple3 | []): Tuple3;
  /**
   * Returns a string representation of a vector
   *
   * @param {ReadonlyVec3} a vector to represent as a string
   * @returns {String} string representation of the vector
   */
  export function str(a: ReadonlyVec3): string;
  /**
   * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyVec3} a The first vector.
   * @param {ReadonlyVec3} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyVec3, b: ReadonlyVec3): boolean;
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   *
   * @param {ReadonlyVec3} a The first vector.
   * @param {ReadonlyVec3} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function equals(a: ReadonlyVec3, b: ReadonlyVec3): boolean;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function sub(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Multiplies two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function mul(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Divides two Tuple3's
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Tuple3} out
   */
  export function div(
    out: Tuple3 | [],
    a: ReadonlyVec3,
    b: ReadonlyVec3
  ): Tuple3;
  /**
   * Calculates the euclidian distance between two Tuple3's
   *
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Number} distance between a and b
   */
  export function dist(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Calculates the squared euclidian distance between two Tuple3's
   *
   * @param {ReadonlyVec3} a the first operand
   * @param {ReadonlyVec3} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function sqrDist(a: ReadonlyVec3, b: ReadonlyVec3): number;
  /**
   * Calculates the length of a Tuple3
   *
   * @param {ReadonlyVec3} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function len(a: ReadonlyVec3): number;
  /**
   * Calculates the squared length of a Tuple3
   *
   * @param {ReadonlyVec3} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function sqrLen(a: ReadonlyVec3): number;
  export function forEach(
    a: any,
    stride: any,
    offset: any,
    count: any,
    fn: any,
    arg: any
  ): any;
}
export namespace vec4 {
  /**
   * 4 Dimensional Vector
   * @module vec4
   */
  /**
   * Creates a new, empty Tuple4
   *
   * @returns {Tuple4} a new 4D vector
   */
  export function create(): Tuple4;
  /**
   * Creates a new Tuple4 initialized with values from an existing vector
   *
   * @param {ReadonlyVec4} a vector to clone
   * @returns {Tuple4} a new 4D vector
   */
  export function clone(a: ReadonlyVec4): Tuple4;
  /**
   * Creates a new Tuple4 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @param {Number} w W component
   * @returns {Tuple4} a new 4D vector
   */
  export function fromValues(
    x: number,
    y: number,
    z: number,
    w: number
  ): Tuple4;
  /**
   * Copy the values from one Tuple4 to another
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the source vector
   * @returns {Tuple4} out
   */
  export function copy(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Set the components of a Tuple4 to the given values
   *
   * @param {Tuple4} out the receiving vector
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @param {Number} w W component
   * @returns {Tuple4} out
   */
  export function set(
    out: Tuple4 | [],
    x: number,
    y: number,
    z: number,
    w: number
  ): Tuple4;
  /**
   * Adds two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function add(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function subtract(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Multiplies two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function multiply(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Divides two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function divide(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Math.ceil the components of a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to ceil
   * @returns {Tuple4} out
   */
  export function ceil(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Math.floor the components of a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to floor
   * @returns {Tuple4} out
   */
  export function floor(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Returns the minimum of two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function min(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Returns the maximum of two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function max(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Math.round the components of a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to round
   * @returns {Tuple4} out
   */
  export function round(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Scales a Tuple4 by a scalar number
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the vector to scale
   * @param {Number} b amount to scale the vector by
   * @returns {Tuple4} out
   */
  export function scale(out: Tuple4 | [], a: ReadonlyVec4, b: number): Tuple4;
  /**
   * Adds two Tuple4's after scaling the second operand by a scalar value
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @param {Number} scale the amount to scale b by before adding
   * @returns {Tuple4} out
   */
  export function scaleAndAdd(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4,
    scale: number
  ): Tuple4;
  /**
   * Calculates the euclidian distance between two Tuple4's
   *
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Number} distance between a and b
   */
  export function distance(a: ReadonlyVec4, b: ReadonlyVec4): number;
  /**
   * Calculates the squared euclidian distance between two Tuple4's
   *
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function squaredDistance(a: ReadonlyVec4, b: ReadonlyVec4): number;
  /**
   * Calculates the length of a Tuple4
   *
   * @param {ReadonlyVec4} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function length(a: ReadonlyVec4): number;
  /**
   * Calculates the squared length of a Tuple4
   *
   * @param {ReadonlyVec4} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function squaredLength(a: ReadonlyVec4): number;
  /**
   * Negates the components of a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to negate
   * @returns {Tuple4} out
   */
  export function negate(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Returns the inverse of the components of a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to invert
   * @returns {Tuple4} out
   */
  export function inverse(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Normalize a Tuple4
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a vector to normalize
   * @returns {Tuple4} out
   */
  export function normalize(out: Tuple4 | [], a: ReadonlyVec4): Tuple4;
  /**
   * Calculates the dot product of two Tuple4's
   *
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Number} dot product of a and b
   */
  export function dot(a: ReadonlyVec4, b: ReadonlyVec4): number;
  /**
   * Returns the cross-product of three vectors in a 4-dimensional space
   *
   * @param {ReadonlyVec4} result the receiving vector
   * @param {ReadonlyVec4} U the first vector
   * @param {ReadonlyVec4} V the second vector
   * @param {ReadonlyVec4} W the third vector
   * @returns {Tuple4} result
   */
  export function cross(out: any, u: any, v: any, w: any): Tuple4;
  /**
   * Performs a linear interpolation between two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {Tuple4} out
   */
  export function lerp(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4,
    t: number
  ): Tuple4;
  /**
   * Generates a random vector with the given scale
   *
   * @param {Tuple4} out the receiving vector
   * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
   * @returns {Tuple4} out
   */
  export function random(out: Tuple4 | [], scale?: number): Tuple4;
  /**
   * Transforms the Tuple4 with a MatrixTuple4x4.
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the vector to transform
   * @param {ReadonlyMat4} m matrix to transform with
   * @returns {Tuple4} out
   */
  export function transformMat4(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    m: ReadonlyMat4
  ): Tuple4;
  /**
   * Transforms the Tuple4 with a quat
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the vector to transform
   * @param {ReadonlyQuat} q quaternion to transform with
   * @returns {Tuple4} out
   */
  export function transformQuat(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    q: ReadonlyQuat
  ): Tuple4;
  /**
   * Set the components of a Tuple4 to zero
   *
   * @param {Tuple4} out the receiving vector
   * @returns {Tuple4} out
   */
  export function zero(out: Tuple4 | []): Tuple4;
  /**
   * Returns a string representation of a vector
   *
   * @param {ReadonlyVec4} a vector to represent as a string
   * @returns {String} string representation of the vector
   */
  export function str(a: ReadonlyVec4): string;
  /**
   * Returns whether or not the vectors have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyVec4} a The first vector.
   * @param {ReadonlyVec4} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyVec4, b: ReadonlyVec4): boolean;
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   *
   * @param {ReadonlyVec4} a The first vector.
   * @param {ReadonlyVec4} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function equals(a: ReadonlyVec4, b: ReadonlyVec4): boolean;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function sub(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Multiplies two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function mul(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Divides two Tuple4's
   *
   * @param {Tuple4} out the receiving vector
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Tuple4} out
   */
  export function div(
    out: Tuple4 | [],
    a: ReadonlyVec4,
    b: ReadonlyVec4
  ): Tuple4;
  /**
   * Calculates the euclidian distance between two Tuple4's
   *
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Number} distance between a and b
   */
  export function dist(a: ReadonlyVec4, b: ReadonlyVec4): number;
  /**
   * Calculates the squared euclidian distance between two Tuple4's
   *
   * @param {ReadonlyVec4} a the first operand
   * @param {ReadonlyVec4} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function sqrDist(a: ReadonlyVec4, b: ReadonlyVec4): number;
  /**
   * Calculates the length of a Tuple4
   *
   * @param {ReadonlyVec4} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function len(a: ReadonlyVec4): number;
  /**
   * Calculates the squared length of a Tuple4
   *
   * @param {ReadonlyVec4} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function sqrLen(a: ReadonlyVec4): number;
  export function forEach(
    a: any,
    stride: any,
    offset: any,
    count: any,
    fn: any,
    arg: any
  ): any;
}
export namespace quat {
  /**
   * Quaternion
   * @module quat
   */
  /**
   * Creates a new identity quat
   *
   * @returns {quat} a new quaternion
   */
  export function create(): quat;
  /**
   * Set a quat to the identity quaternion
   *
   * @param {quat} out the receiving quaternion
   * @returns {quat} out
   */
  export function identity(out: quat): quat;
  /**
   * Sets a quat from the given angle and rotation axis,
   * then returns it.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyVec3} axis the axis around which to rotate
   * @param {Number} rad the angle in radians
   * @returns {quat} out
   **/
  export function setAxisAngle(
    out: quat,
    axis: ReadonlyVec3,
    rad: number
  ): quat;
  /**
   * Gets the rotation axis and angle for a given
   *  quaternion. If a quaternion is created with
   *  setAxisAngle, this method will return the same
   *  values as providied in the original parameter list
   *  OR functionally equivalent values.
   * Example: The quaternion formed by axis [0, 0, 1] and
   *  angle -90 is the same as the quaternion formed by
   *  [0, 0, 1] and 270. This method favors the latter.
   * @param  {Tuple3} out_axis  Vector receiving the axis of rotation
   * @param  {ReadonlyQuat} q     Quaternion to be decomposed
   * @return {Number}     Angle, in radians, of the rotation
   */
  export function getAxisAngle(outAxis: Tuple3, q: ReadonlyQuat): number;
  /**
   * Gets the angular distance between two unit quaternions
   *
   * @param  {ReadonlyQuat} a     Origin unit quaternion
   * @param  {ReadonlyQuat} b     Destination unit quaternion
   * @return {Number}     Angle, in radians, between the two quaternions
   */
  export function getAngle(a: ReadonlyQuat, b: ReadonlyQuat): number;
  /**
   * Multiplies two quat's
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @returns {quat} out
   */
  export function multiply(out: quat, a: ReadonlyQuat, b: ReadonlyQuat): quat;
  /**
   * Rotates a quaternion by the given angle about the X axis
   *
   * @param {quat} out quat receiving operation result
   * @param {ReadonlyQuat} a quat to rotate
   * @param {number} rad angle (in radians) to rotate
   * @returns {quat} out
   */
  export function rotateX(out: quat, a: ReadonlyQuat, rad: number): quat;
  /**
   * Rotates a quaternion by the given angle about the Y axis
   *
   * @param {quat} out quat receiving operation result
   * @param {ReadonlyQuat} a quat to rotate
   * @param {number} rad angle (in radians) to rotate
   * @returns {quat} out
   */
  export function rotateY(out: quat, a: ReadonlyQuat, rad: number): quat;
  /**
   * Rotates a quaternion by the given angle about the Z axis
   *
   * @param {quat} out quat receiving operation result
   * @param {ReadonlyQuat} a quat to rotate
   * @param {number} rad angle (in radians) to rotate
   * @returns {quat} out
   */
  export function rotateZ(out: quat, a: ReadonlyQuat, rad: number): quat;
  /**
   * Calculates the W component of a quat from the X, Y, and Z components.
   * Assumes that quaternion is 1 unit in length.
   * Any existing W component will be ignored.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate W component of
   * @returns {quat} out
   */
  export function calculateW(out: quat, a: ReadonlyQuat): quat;
  /**
   * Calculate the exponential of a unit quaternion.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate the exponential of
   * @returns {quat} out
   */
  export function exp(out: quat, a: ReadonlyQuat): quat;
  /**
   * Calculate the natural logarithm of a unit quaternion.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate the exponential of
   * @returns {quat} out
   */
  export function ln(out: quat, a: ReadonlyQuat): quat;
  /**
   * Calculate the scalar power of a unit quaternion.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate the exponential of
   * @param {Number} b amount to scale the quaternion by
   * @returns {quat} out
   */
  export function pow(out: quat, a: ReadonlyQuat, b: number): quat;
  /**
   * Performs a spherical linear interpolation between two quat
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {quat} out
   */
  export function slerp(
    out: quat,
    a: ReadonlyQuat,
    b: ReadonlyQuat,
    t: number
  ): quat;
  /**
   * Generates a random unit quaternion
   *
   * @param {quat} out the receiving quaternion
   * @returns {quat} out
   */
  export function random(out: quat): quat;
  /**
   * Calculates the inverse of a quat
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate inverse of
   * @returns {quat} out
   */
  export function invert(out: quat, a: ReadonlyQuat): quat;
  /**
   * Calculates the conjugate of a quat
   * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quat to calculate conjugate of
   * @returns {quat} out
   */
  export function conjugate(out: quat, a: ReadonlyQuat): quat;
  /**
   * Creates a quaternion from the given 3x3 rotation matrix.
   *
   * NOTE: The resultant quaternion is not normalized, so you should be sure
   * to renormalize the quaternion yourself where necessary.
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyMat3} m rotation matrix
   * @returns {quat} out
   * @function
   */
  export function fromMat3(out: quat, m: ReadonlyMat3): quat;
  /**
   * Creates a quaternion from the given euler angle x, y, z.
   *
   * @param {quat} out the receiving quaternion
   * @param {x} Angle to rotate around X axis in degrees.
   * @param {y} Angle to rotate around Y axis in degrees.
   * @param {z} Angle to rotate around Z axis in degrees.
   * @returns {quat} out
   * @function
   */
  export function fromEuler(out: quat, x: any, y: any, z: any): quat;
  /**
   * Returns a string representation of a quatenion
   *
   * @param {ReadonlyQuat} a vector to represent as a string
   * @returns {String} string representation of the vector
   */
  export function str(a: ReadonlyQuat): string;
  /**
   * Creates a new quat initialized with values from an existing quaternion
   *
   * @param {ReadonlyQuat} a quaternion to clone
   * @returns {quat} a new quaternion
   * @function
   */
  export const clone: typeof vec4.clone;
  /**
   * Creates a new quat initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @param {Number} w W component
   * @returns {quat} a new quaternion
   * @function
   */
  export const fromValues: typeof vec4.fromValues;
  /**
   * Copy the values from one quat to another
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the source quaternion
   * @returns {quat} out
   * @function
   */
  export const copy: typeof vec4.copy;
  /**
   * Set the components of a quat to the given values
   *
   * @param {quat} out the receiving quaternion
   * @param {Number} x X component
   * @param {Number} y Y component
   * @param {Number} z Z component
   * @param {Number} w W component
   * @returns {quat} out
   * @function
   */
  export const set: typeof vec4.set;
  /**
   * Adds two quat's
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @returns {quat} out
   * @function
   */
  export const add: typeof vec4.add;
  /**
   * Multiplies two quat's
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @returns {quat} out
   */
  export function mul(out: quat, a: ReadonlyQuat, b: ReadonlyQuat): quat;
  /**
   * Scales a quat by a scalar number
   *
   * @param {quat} out the receiving vector
   * @param {ReadonlyQuat} a the vector to scale
   * @param {Number} b amount to scale the vector by
   * @returns {quat} out
   * @function
   */
  export const scale: typeof vec4.scale;
  /**
   * Calculates the dot product of two quat's
   *
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @returns {Number} dot product of a and b
   * @function
   */
  export const dot: typeof vec4.dot;
  /**
   * Performs a linear interpolation between two quat's
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a the first operand
   * @param {ReadonlyQuat} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {quat} out
   * @function
   */
  export const lerp: typeof vec4.lerp;
  /**
   * Calculates the length of a quat
   *
   * @param {ReadonlyQuat} a vector to calculate length of
   * @returns {Number} length of a
   */
  export const length: typeof vec4.length;
  /**
   * Alias for {@link quat.length}
   * @function
   */
  export const len: typeof vec4.length;
  /**
   * Calculates the squared length of a quat
   *
   * @param {ReadonlyQuat} a vector to calculate squared length of
   * @returns {Number} squared length of a
   * @function
   */
  export const squaredLength: typeof vec4.squaredLength;
  /**
   * Alias for {@link quat.squaredLength}
   * @function
   */
  export const sqrLen: typeof vec4.squaredLength;
  /**
   * Normalize a quat
   *
   * @param {quat} out the receiving quaternion
   * @param {ReadonlyQuat} a quaternion to normalize
   * @returns {quat} out
   * @function
   */
  export const normalize: typeof vec4.normalize;
  /**
   * Returns whether or not the quaternions have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyQuat} a The first quaternion.
   * @param {ReadonlyQuat} b The second quaternion.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export const exactEquals: typeof vec4.exactEquals;
  /**
   * Returns whether or not the quaternions have approximately the same elements in the same position.
   *
   * @param {ReadonlyQuat} a The first vector.
   * @param {ReadonlyQuat} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export const equals: typeof vec4.equals;
  export function rotationTo(out: any, a: any, b: any): any;
  export function sqlerp(out: any, a: any, b: any, c: any, d: any, t: any): any;
  export function setAxes(out: any, view: any, right: any, up: any): Tuple4;
}
export namespace quat2 {
  /**
   * Dual Quaternion<br>
   * Format: [real, dual]<br>
   * Quaternion format: XYZW<br>
   * Make sure to have normalized dual quaternions, otherwise the functions may not work as intended.<br>
   * @module quat2
   */
  /**
   * Creates a new identity dual quat
   *
   * @returns {quat2} a new dual quaternion [real -> rotation, dual -> translation]
   */
  export function create(): quat2;
  /**
   * Creates a new quat initialized with values from an existing quaternion
   *
   * @param {ReadonlyQuat2} a dual quaternion to clone
   * @returns {quat2} new dual quaternion
   * @function
   */
  export function clone(a: ReadonlyQuat2): quat2;
  /**
   * Creates a new dual quat initialized with the given values
   *
   * @param {Number} x1 X component
   * @param {Number} y1 Y component
   * @param {Number} z1 Z component
   * @param {Number} w1 W component
   * @param {Number} x2 X component
   * @param {Number} y2 Y component
   * @param {Number} z2 Z component
   * @param {Number} w2 W component
   * @returns {quat2} new dual quaternion
   * @function
   */
  export function fromValues(
    x1: number,
    y1: number,
    z1: number,
    w1: number,
    x2: number,
    y2: number,
    z2: number,
    w2: number
  ): quat2;
  /**
   * Creates a new dual quat from the given values (quat and translation)
   *
   * @param {Number} x1 X component
   * @param {Number} y1 Y component
   * @param {Number} z1 Z component
   * @param {Number} w1 W component
   * @param {Number} x2 X component (translation)
   * @param {Number} y2 Y component (translation)
   * @param {Number} z2 Z component (translation)
   * @returns {quat2} new dual quaternion
   * @function
   */
  export function fromRotationTranslationValues(
    x1: number,
    y1: number,
    z1: number,
    w1: number,
    x2: number,
    y2: number,
    z2: number
  ): quat2;
  /**
   * Creates a dual quat from a quaternion and a translation
   *
   * @param {ReadonlyQuat2} dual quaternion receiving operation result
   * @param {ReadonlyQuat} q a normalized quaternion
   * @param {ReadonlyVec3} t tranlation vector
   * @returns {quat2} dual quaternion receiving operation result
   * @function
   */
  export function fromRotationTranslation(
    out: any,
    q: ReadonlyQuat,
    t: ReadonlyVec3
  ): quat2;
  /**
   * Creates a dual quat from a translation
   *
   * @param {ReadonlyQuat2} dual quaternion receiving operation result
   * @param {ReadonlyVec3} t translation vector
   * @returns {quat2} dual quaternion receiving operation result
   * @function
   */
  export function fromTranslation(out: any, t: ReadonlyVec3): quat2;
  /**
   * Creates a dual quat from a quaternion
   *
   * @param {ReadonlyQuat2} dual quaternion receiving operation result
   * @param {ReadonlyQuat} q the quaternion
   * @returns {quat2} dual quaternion receiving operation result
   * @function
   */
  export function fromRotation(out: any, q: ReadonlyQuat): quat2;
  /**
   * Creates a new dual quat from a matrix (4x4)
   *
   * @param {quat2} out the dual quaternion
   * @param {ReadonlyMat4} a the matrix
   * @returns {quat2} dual quat receiving operation result
   * @function
   */
  export function fromMat4(out: quat2, a: ReadonlyMat4): quat2;
  /**
   * Copy the values from one dual quat to another
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the source dual quaternion
   * @returns {quat2} out
   * @function
   */
  export function copy(out: quat2, a: ReadonlyQuat2): quat2;
  /**
   * Set a dual quat to the identity dual quaternion
   *
   * @param {quat2} out the receiving quaternion
   * @returns {quat2} out
   */
  export function identity(out: quat2): quat2;
  /**
   * Set the components of a dual quat to the given values
   *
   * @param {quat2} out the receiving quaternion
   * @param {Number} x1 X component
   * @param {Number} y1 Y component
   * @param {Number} z1 Z component
   * @param {Number} w1 W component
   * @param {Number} x2 X component
   * @param {Number} y2 Y component
   * @param {Number} z2 Z component
   * @param {Number} w2 W component
   * @returns {quat2} out
   * @function
   */
  export function set(
    out: quat2,
    x1: number,
    y1: number,
    z1: number,
    w1: number,
    x2: number,
    y2: number,
    z2: number,
    w2: number
  ): quat2;
  /**
   * Gets the dual part of a dual quat
   * @param  {quat} out dual part
   * @param  {ReadonlyQuat2} a Dual Quaternion
   * @return {quat} dual part
   */
  export function getDual(out: quat, a: ReadonlyQuat2): quat;
  /**
   * Set the dual component of a dual quat to the given quaternion
   *
   * @param {quat2} out the receiving quaternion
   * @param {ReadonlyQuat} q a quaternion representing the dual part
   * @returns {quat2} out
   * @function
   */
  export function setDual(out: quat2, q: ReadonlyQuat): quat2;
  /**
   * Gets the translation of a normalized dual quat
   * @param  {Tuple3} out translation
   * @param  {ReadonlyQuat2} a Dual Quaternion to be decomposed
   * @return {Tuple3} translation
   */
  export function getTranslation(out: Tuple3 | [], a: ReadonlyQuat2): Tuple3;
  /**
   * Translates a dual quat by the given vector
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to translate
   * @param {ReadonlyVec3} v vector to translate by
   * @returns {quat2} out
   */
  export function translate(
    out: quat2,
    a: ReadonlyQuat2,
    v: ReadonlyVec3
  ): quat2;
  /**
   * Rotates a dual quat around the X axis
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @param {number} rad how far should the rotation be
   * @returns {quat2} out
   */
  export function rotateX(out: quat2, a: ReadonlyQuat2, rad: number): quat2;
  /**
   * Rotates a dual quat around the Y axis
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @param {number} rad how far should the rotation be
   * @returns {quat2} out
   */
  export function rotateY(out: quat2, a: ReadonlyQuat2, rad: number): quat2;
  /**
   * Rotates a dual quat around the Z axis
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @param {number} rad how far should the rotation be
   * @returns {quat2} out
   */
  export function rotateZ(out: quat2, a: ReadonlyQuat2, rad: number): quat2;
  /**
   * Rotates a dual quat by a given quaternion (a * q)
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @param {ReadonlyQuat} q quaternion to rotate by
   * @returns {quat2} out
   */
  export function rotateByQuatAppend(
    out: quat2,
    a: ReadonlyQuat2,
    q: ReadonlyQuat
  ): quat2;
  /**
   * Rotates a dual quat by a given quaternion (q * a)
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat} q quaternion to rotate by
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @returns {quat2} out
   */
  export function rotateByQuatPrepend(
    out: quat2,
    q: ReadonlyQuat,
    a: ReadonlyQuat2
  ): quat2;
  /**
   * Rotates a dual quat around a given axis. Does the normalisation automatically
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the dual quaternion to rotate
   * @param {ReadonlyVec3} axis the axis to rotate around
   * @param {Number} rad how far the rotation should be
   * @returns {quat2} out
   */
  export function rotateAroundAxis(
    out: quat2,
    a: ReadonlyQuat2,
    axis: ReadonlyVec3,
    rad: number
  ): quat2;
  /**
   * Adds two dual quat's
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the first operand
   * @param {ReadonlyQuat2} b the second operand
   * @returns {quat2} out
   * @function
   */
  export function add(out: quat2, a: ReadonlyQuat2, b: ReadonlyQuat2): quat2;
  /**
   * Multiplies two dual quat's
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the first operand
   * @param {ReadonlyQuat2} b the second operand
   * @returns {quat2} out
   */
  export function multiply(
    out: quat2,
    a: ReadonlyQuat2,
    b: ReadonlyQuat2
  ): quat2;
  /**
   * Scales a dual quat by a scalar number
   *
   * @param {quat2} out the receiving dual quat
   * @param {ReadonlyQuat2} a the dual quat to scale
   * @param {Number} b amount to scale the dual quat by
   * @returns {quat2} out
   * @function
   */
  export function scale(out: quat2, a: ReadonlyQuat2, b: number): quat2;
  /**
   * Performs a linear interpolation between two dual quats's
   * NOTE: The resulting dual quaternions won't always be normalized (The error is most noticeable when t = 0.5)
   *
   * @param {quat2} out the receiving dual quat
   * @param {ReadonlyQuat2} a the first operand
   * @param {ReadonlyQuat2} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {quat2} out
   */
  export function lerp(
    out: quat2,
    a: ReadonlyQuat2,
    b: ReadonlyQuat2,
    t: number
  ): quat2;
  /**
   * Calculates the inverse of a dual quat. If they are normalized, conjugate is cheaper
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a dual quat to calculate inverse of
   * @returns {quat2} out
   */
  export function invert(out: quat2, a: ReadonlyQuat2): quat2;
  /**
   * Calculates the conjugate of a dual quat
   * If the dual quaternion is normalized, this function is faster than quat2.inverse and produces the same result.
   *
   * @param {quat2} out the receiving quaternion
   * @param {ReadonlyQuat2} a quat to calculate conjugate of
   * @returns {quat2} out
   */
  export function conjugate(out: quat2, a: ReadonlyQuat2): quat2;
  /**
   * Normalize a dual quat
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a dual quaternion to normalize
   * @returns {quat2} out
   * @function
   */
  export function normalize(out: quat2, a: ReadonlyQuat2): quat2;
  /**
   * Returns a string representation of a dual quatenion
   *
   * @param {ReadonlyQuat2} a dual quaternion to represent as a string
   * @returns {String} string representation of the dual quat
   */
  export function str(a: ReadonlyQuat2): string;
  /**
   * Returns whether or not the dual quaternions have exactly the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyQuat2} a the first dual quaternion.
   * @param {ReadonlyQuat2} b the second dual quaternion.
   * @returns {Boolean} true if the dual quaternions are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyQuat2, b: ReadonlyQuat2): boolean;
  /**
   * Returns whether or not the dual quaternions have approximately the same elements in the same position.
   *
   * @param {ReadonlyQuat2} a the first dual quat.
   * @param {ReadonlyQuat2} b the second dual quat.
   * @returns {Boolean} true if the dual quats are equal, false otherwise.
   */
  export function equals(a: ReadonlyQuat2, b: ReadonlyQuat2): boolean;
  /**
   * Gets the real part of a dual quat
   * @param  {quat} out real part
   * @param  {ReadonlyQuat2} a Dual Quaternion
   * @return {quat} real part
   */
  export const getReal: typeof vec4.copy;
  /**
   * Set the real component of a dual quat to the given quaternion
   *
   * @param {quat2} out the receiving quaternion
   * @param {ReadonlyQuat} q a quaternion representing the real part
   * @returns {quat2} out
   * @function
   */
  export const setReal: typeof vec4.copy;
  /**
   * Multiplies two dual quat's
   *
   * @param {quat2} out the receiving dual quaternion
   * @param {ReadonlyQuat2} a the first operand
   * @param {ReadonlyQuat2} b the second operand
   * @returns {quat2} out
   */
  export function mul(out: quat2, a: ReadonlyQuat2, b: ReadonlyQuat2): quat2;
  /**
   * Calculates the dot product of two dual quat's (The dot product of the real parts)
   *
   * @param {ReadonlyQuat2} a the first operand
   * @param {ReadonlyQuat2} b the second operand
   * @returns {Number} dot product of a and b
   * @function
   */
  export const dot: typeof vec4.dot;
  /**
   * Calculates the length of a dual quat
   *
   * @param {ReadonlyQuat2} a dual quat to calculate length of
   * @returns {Number} length of a
   * @function
   */
  export const length: typeof vec4.length;
  /**
   * Alias for {@link quat2.length}
   * @function
   */
  export const len: typeof vec4.length;
  /**
   * Calculates the squared length of a dual quat
   *
   * @param {ReadonlyQuat2} a dual quat to calculate squared length of
   * @returns {Number} squared length of a
   * @function
   */
  export const squaredLength: typeof vec4.squaredLength;
  /**
   * Alias for {@link quat2.squaredLength}
   * @function
   */
  export const sqrLen: typeof vec4.squaredLength;
}
export namespace vec2 {
  /**
   * 2 Dimensional Vector
   * @module vec2
   */
  /**
   * Creates a new, empty Tuple2
   *
   * @returns {Tuple2} a new 2D vector
   */
  export function create(): Tuple2;
  /**
   * Creates a new Tuple2 initialized with values from an existing vector
   *
   * @param {ReadonlyVec2} a vector to clone
   * @returns {Tuple2} a new 2D vector
   */
  export function clone(a: ReadonlyVec2): Tuple2;
  /**
   * Creates a new Tuple2 initialized with the given values
   *
   * @param {Number} x X component
   * @param {Number} y Y component
   * @returns {Tuple2} a new 2D vector
   */
  export function fromValues(x: number, y: number): Tuple2;
  /**
   * Copy the values from one Tuple2 to another
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the source vector
   * @returns {Tuple2} out
   */
  export function copy(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Set the components of a Tuple2 to the given values
   *
   * @param {Tuple2} out the receiving vector
   * @param {Number} x X component
   * @param {Number} y Y component
   * @returns {Tuple2} out
   */
  export function set(out: Tuple2 | [], x: number, y: number): Tuple2;
  /**
   * Adds two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function add(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function subtract(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Multiplies two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function multiply(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Divides two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function divide(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Math.ceil the components of a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to ceil
   * @returns {Tuple2} out
   */
  export function ceil(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Math.floor the components of a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to floor
   * @returns {Tuple2} out
   */
  export function floor(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Returns the minimum of two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function min(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Returns the maximum of two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function max(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Math.round the components of a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to round
   * @returns {Tuple2} out
   */
  export function round(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Scales a Tuple2 by a scalar number
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the vector to scale
   * @param {Number} b amount to scale the vector by
   * @returns {Tuple2} out
   */
  export function scale(out: Tuple2 | [], a: ReadonlyVec2, b: number): Tuple2;
  /**
   * Adds two Tuple2's after scaling the second operand by a scalar value
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @param {Number} scale the amount to scale b by before adding
   * @returns {Tuple2} out
   */
  export function scaleAndAdd(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2,
    scale: number
  ): Tuple2;
  /**
   * Calculates the euclidian distance between two Tuple2's
   *
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Number} distance between a and b
   */
  export function distance(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Calculates the squared euclidian distance between two Tuple2's
   *
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function squaredDistance(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Calculates the length of a Tuple2
   *
   * @param {ReadonlyVec2} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function length(a: ReadonlyVec2): number;
  /**
   * Calculates the squared length of a Tuple2
   *
   * @param {ReadonlyVec2} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function squaredLength(a: ReadonlyVec2): number;
  /**
   * Negates the components of a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to negate
   * @returns {Tuple2} out
   */
  export function negate(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Returns the inverse of the components of a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to invert
   * @returns {Tuple2} out
   */
  export function inverse(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Normalize a Tuple2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a vector to normalize
   * @returns {Tuple2} out
   */
  export function normalize(out: Tuple2 | [], a: ReadonlyVec2): Tuple2;
  /**
   * Calculates the dot product of two Tuple2's
   *
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Number} dot product of a and b
   */
  export function dot(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Computes the cross product of two Tuple2's
   * Note that the cross product must by definition produce a 3D vector
   *
   * @param {Tuple3} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple3} out
   */
  export function cross(
    out: Tuple3 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple3;
  /**
   * Performs a linear interpolation between two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
   * @returns {Tuple2} out
   */
  export function lerp(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2,
    t: number
  ): Tuple2;
  /**
   * Generates a random vector with the given scale
   *
   * @param {Tuple2} out the receiving vector
   * @param {Number} [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
   * @returns {Tuple2} out
   */
  export function random(out: Tuple2 | [], scale?: number): Tuple2;
  /**
   * Transforms the Tuple2 with a MatrixTuple2x2
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the vector to transform
   * @param {ReadonlyMat2} m matrix to transform with
   * @returns {Tuple2} out
   */
  export function transformMat2(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    m: ReadonlyMat2
  ): Tuple2;
  /**
   * Transforms the Tuple2 with a MatrixTuple2x3
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the vector to transform
   * @param {ReadonlyMat2d} m matrix to transform with
   * @returns {Tuple2} out
   */
  export function transformMat2d(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    m: ReadonlyMat2d
  ): Tuple2;
  /**
   * Transforms the Tuple2 with a MatrixTuple3x3
   * 3rd vector component is implicitly '1'
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the vector to transform
   * @param {ReadonlyMat3} m matrix to transform with
   * @returns {Tuple2} out
   */
  export function transformMat3(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    m: ReadonlyMat3
  ): Tuple2;
  /**
   * Transforms the Tuple2 with a MatrixTuple4x4
   * 3rd vector component is implicitly '0'
   * 4th vector component is implicitly '1'
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the vector to transform
   * @param {ReadonlyMat4} m matrix to transform with
   * @returns {Tuple2} out
   */
  export function transformMat4(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    m: ReadonlyMat4
  ): Tuple2;
  /**
   * Rotate a 2D vector
   * @param {Tuple2} out The receiving Tuple2
   * @param {ReadonlyVec2} a The Tuple2 point to rotate
   * @param {ReadonlyVec2} b The origin of the rotation
   * @param {Number} rad The angle of rotation in radians
   * @returns {Tuple2} out
   */
  export function rotate(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2,
    rad: number
  ): Tuple2;
  /**
   * Get the angle between two 2D vectors
   * @param {ReadonlyVec2} a The first operand
   * @param {ReadonlyVec2} b The second operand
   * @returns {Number} The angle in radians
   */
  export function angle(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Set the components of a Tuple2 to zero
   *
   * @param {Tuple2} out the receiving vector
   * @returns {Tuple2} out
   */
  export function zero(out: Tuple2 | []): Tuple2;
  /**
   * Returns a string representation of a vector
   *
   * @param {ReadonlyVec2} a vector to represent as a string
   * @returns {String} string representation of the vector
   */
  export function str(a: ReadonlyVec2): string;
  /**
   * Returns whether or not the vectors exactly have the same elements in the same position (when compared with ===)
   *
   * @param {ReadonlyVec2} a The first vector.
   * @param {ReadonlyVec2} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function exactEquals(a: ReadonlyVec2, b: ReadonlyVec2): boolean;
  /**
   * Returns whether or not the vectors have approximately the same elements in the same position.
   *
   * @param {ReadonlyVec2} a The first vector.
   * @param {ReadonlyVec2} b The second vector.
   * @returns {Boolean} True if the vectors are equal, false otherwise.
   */
  export function equals(a: ReadonlyVec2, b: ReadonlyVec2): boolean;
  /**
   * Calculates the length of a Tuple2
   *
   * @param {ReadonlyVec2} a vector to calculate length of
   * @returns {Number} length of a
   */
  export function len(a: ReadonlyVec2): number;
  /**
   * Subtracts vector b from vector a
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function sub(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Multiplies two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function mul(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Divides two Tuple2's
   *
   * @param {Tuple2} out the receiving vector
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Tuple2} out
   */
  export function div(
    out: Tuple2 | [],
    a: ReadonlyVec2,
    b: ReadonlyVec2
  ): Tuple2;
  /**
   * Calculates the euclidian distance between two Tuple2's
   *
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Number} distance between a and b
   */
  export function dist(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Calculates the squared euclidian distance between two Tuple2's
   *
   * @param {ReadonlyVec2} a the first operand
   * @param {ReadonlyVec2} b the second operand
   * @returns {Number} squared distance between a and b
   */
  export function sqrDist(a: ReadonlyVec2, b: ReadonlyVec2): number;
  /**
   * Calculates the squared length of a Tuple2
   *
   * @param {ReadonlyVec2} a vector to calculate squared length of
   * @returns {Number} squared length of a
   */
  export function sqrLen(a: ReadonlyVec2): number;
  export function forEach(
    a: any,
    stride: any,
    offset: any,
    count: any,
    fn: any,
    arg: any
  ): any;
}

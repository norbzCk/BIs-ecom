/**
 * JSON.stringify throws "Do not know how to serialize a BigInt" for any
 * BigInt value, and every id in this schema is a BigInt. Express applies this
 * replacer inside res.json(), so converting here keeps BigInts serializable
 * without patching BigInt.prototype globally.
 *
 * Values are emitted as strings: it is lossless for ids beyond Number's
 * MAX_SAFE_INTEGER, and it lines up with route/query params, which are already
 * strings. If you would rather have numbers, replace the return with
 * `value.toString()` -> `Number(value)` and accept that ids above
 * Number.MAX_SAFE_INTEGER lose precision.
 */
export function bigintJsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

import type { EmbeddingVector } from ".";

export type EmbeddingVectorInput = EmbeddingVector | Float32Array;

export const toFloat32Vector = (vector: EmbeddingVectorInput): Float32Array => {
  if (vector instanceof Float32Array) {
    return vector;
  }

  return Float32Array.from(vector);
};

export const toPersistedVector = (
  vector: EmbeddingVectorInput,
  expectedDimension?: number,
  label = "embedding"
): EmbeddingVector => {
  const persisted = vector instanceof Float32Array ? Array.from(vector) : vector;
  assertVectorDimension(persisted, expectedDimension, label);
  return persisted;
};

export function assertVectorDimension(
  vector: EmbeddingVectorInput | null | undefined,
  expectedDimension?: number,
  label = "embedding"
): asserts vector is EmbeddingVectorInput {
  if (!vector) {
    throw new Error(`${label} vector is missing.`);
  }

  if (vector.length === 0) {
    throw new Error(`${label} vector is empty.`);
  }

  if (expectedDimension && vector.length !== expectedDimension) {
    throw new Error(
      `${label} vector dimension mismatch. Expected ${expectedDimension}, received ${vector.length}.`
    );
  }
}

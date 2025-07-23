/**
 * Calculates the average of an array of vectors (number arrays).
 * @param vectors An array of vectors, where each vector is an array of numbers. All vectors must have the same length.
 * @returns A new vector representing the average, or an empty array if the input is empty.
 */
export function averageEmbeddings(vectors: number[][]): number[] {
  // 1. Handle the edge case of an empty input array to avoid errors.
  if (vectors.length === 0) {
    return [];
  }

  const vectorCount = vectors.length;
  const dimension = vectors[0].length; // Assumes all vectors have the same dimension

  // 2. Sum all vectors element-wise using `reduce`.
  // The accumulator `acc` starts as a zero-filled array of the correct dimension.
  const sumVector = vectors.reduce((acc, currentVector) => {
    for (let i = 0; i < dimension; i++) {
      acc[i] += currentVector[i];
    }
    return acc;
  }, new Array(dimension).fill(0));

  // 3. Divide each element of the sum vector by the total number of vectors.
  const averageVector = sumVector.map((value) => value / vectorCount);

  return averageVector;
}

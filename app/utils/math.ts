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

/**
 * Calculates the weighted average (linear interpolation) between two vectors.
 * The result is a new vector that is shifted from vectorA towards vectorB.
 *
 * @param vectorA The base vector (will have a weight of 1 - weightB).
 * @param vectorB The vector to shift towards.
 * @param weightB The weight of vectorB, typically between 0 and 1.
 * - A weight of 0 returns a copy of vectorA.
 * - A weight of 0.5 returns the midpoint between vectorA and vectorB.
 * - A weight of 1 returns a copy of vectorB.
 * @returns A new vector representing the weighted average.
 * @throws An error if the vectors do not have the same dimensions.
 */
export function weightedAverage(
  vectorA: number[],
  vectorB: number[],
  weightB: number,
): number[] {
  console.log("lentghs: ", vectorA.length, vectorB.length);
  if (vectorA.length !== vectorB.length) {
    throw new Error(
      "Vectors must have the same dimensions for weighted averaging.",
    );
  }

  const weightA = 1 - weightB;

  // Calculate the new vector by applying the weights to each corresponding element.
  const resultVector = vectorA.map((valueA, i) => {
    const valueB = vectorB[i];
    return valueA * weightA + valueB * weightB;
  });

  return resultVector;
}

/**
 * Adds two vectors together element-wise.
 * @param vectorA The first vector operand.
 * @param vectorB The second vector operand.
 * @returns A new vector that is the sum of the two input vectors.
 * @throws An error if the vectors do not have the same dimensions.
 */
export function addVectors(vectorA: number[], vectorB: number[]): number[] {
  if (vectorA.length !== vectorB.length) {
    throw new Error("Vectors must have the same dimensions for addition.");
  }

  // Use .map() to create a new array by adding the elements at each index.
  const resultVector = vectorA.map((value, i) => value + vectorB[i]);

  return resultVector;
}

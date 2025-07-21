/**
 * Generates a simple unique ID using the current timestamp and a random string.
 * @returns {string} A unique identifier.
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

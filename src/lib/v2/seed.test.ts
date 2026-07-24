import { describe, expect, it } from "vitest";
import { HISTORY_WEEKS, PRODUCTS } from "./constants";
import { generateHistory } from "./seed";

describe("histórico del catálogo", () => {
  it("incluye ocho semanas para los seis productos, incluso huevo y detergente", () => {
    const history = generateHistory(12345);
    expect(history).toHaveLength(PRODUCTS.length * HISTORY_WEEKS);
    for (const product of PRODUCTS) {
      expect(history.filter((row) => row.sku === product.sku)).toHaveLength(HISTORY_WEEKS);
    }
  });
});

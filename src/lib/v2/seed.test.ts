import { describe, expect, it } from "vitest";
import { HISTORY_WEEKS, PRODUCTS } from "./constants";
import { generateDemandPlan, generateHistory } from "./seed";

describe("histórico del catálogo", () => {
  it("incluye ocho semanas para los seis productos, incluso huevo y detergente", () => {
    const history = generateHistory(12345);
    expect(history).toHaveLength(PRODUCTS.length * HISTORY_WEEKS);
    for (const product of PRODUCTS) {
      expect(history.filter((row) => row.sku === product.sku)).toHaveLength(HISTORY_WEEKS);
    }
  });
});

it("habilita maple y detergente desde la semana 0", () => {
  const availableFromStart = PRODUCTS.filter((product) => product.activeFromRound === 0).map((product) => product.sku);
  expect(availableFromStart).toEqual(["HUEVOS", "DETERG"]);

  const firstWeekDemand = generateDemandPlan(12345).filter((row) => row.roundNumber === 1);
  expect(firstWeekDemand.find((row) => row.sku === "HUEVOS")?.planned).toBeGreaterThan(0);
  expect(firstWeekDemand.find((row) => row.sku === "DETERG")?.planned).toBeGreaterThan(0);
});

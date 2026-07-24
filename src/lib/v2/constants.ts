// Seed del juego v2 "La Tiendita de Doña Peta". Fuente de verdad: PLAN-V2.md §2/§4.
// Se inserta por sesión al crearla. Validar cualquier cambio con `npm run calibrate`.

export const CURRENCY = "Bs";
export const DEFAULT_TOTAL_ROUNDS = 5;

/** Parámetros económicos por defecto (PLAN §2). */
export const ECONOMICS = {
  startingCash: 800,
  fixedCostPerRound: 60,
  holdingCostPerUnit: 0.2,
  /** Bs por cada punto de % de servicio promedio (bono del puntaje). */
  serviceBonusPerPoint: 5,
  /** Estante vigente al 50% del costo (liquidación / valor del inventario). */
  salvageRate: 0.5,
};

// ---------------------------------------------------------------- Catálogo (6)
export type ProductSeed = {
  sku: string;
  name: string;
  unitLabel: string;
  salePrice: number;
  shelfLifeRounds: number | null; // null = no vence
  activeFromRound: number;
  baseDemand: number;
  startingStock: number;
  /** Vencimiento del lote heredado (null = no vence). */
  initialExpiresAfterRound: number | null;
};

export const PRODUCTS: ProductSeed[] = [
  { sku: "REFRESCO", name: "Refresco 2L", unitLabel: "u", salePrice: 15.0, shelfLifeRounds: null, activeFromRound: 1, baseDemand: 45, startingStock: 20, initialExpiresAfterRound: null },
  { sku: "PAN", name: "Pan de batalla", unitLabel: "u", salePrice: 0.8, shelfLifeRounds: 1, activeFromRound: 1, baseDemand: 150, startingStock: 60, initialExpiresAfterRound: 1 },
  { sku: "LECHE", name: "Leche PIL 1L", unitLabel: "u", salePrice: 7.5, shelfLifeRounds: 2, activeFromRound: 1, baseDemand: 30, startingStock: 12, initialExpiresAfterRound: 1 },
  { sku: "SNACKS", name: "Snack surtido", unitLabel: "bolsita", salePrice: 2.5, shelfLifeRounds: null, activeFromRound: 1, baseDemand: 110, startingStock: 40, initialExpiresAfterRound: null },
  { sku: "HUEVOS", name: "Maple de huevos", unitLabel: "maple", salePrice: 36.0, shelfLifeRounds: 3, activeFromRound: 2, baseDemand: 8, startingStock: 2, initialExpiresAfterRound: null },
  { sku: "DETERG", name: "Detergente 400 g", unitLabel: "u", salePrice: 11.0, shelfLifeRounds: null, activeFromRound: 2, baseDemand: 6, startingStock: 4, initialExpiresAfterRound: null },
];

// ------------------------------------------------------------- Proveedores (2)
export type SupplierSeed = {
  code: "PRINCIPAL" | "LUCHO";
  name: string;
  blurb: string;
  isExpress: boolean; // true = entrega hoy (lead 0)
  leadTimeRounds: number;
};

export const SUPPLIERS: SupplierSeed[] = [
  {
    code: "PRINCIPAL",
    name: "Distribuidora La Principal",
    blurb: "El camión: barato, pero entrega la PRÓXIMA semana. Se compra por cajas.",
    isExpress: false,
    leadTimeRounds: 1,
  },
  {
    code: "LUCHO",
    name: "Almacén Don Lucho",
    blurb: "El rival de enfrente: caro, pero te vende HOY y suelto. Tope por semana.",
    isExpress: true,
    leadTimeRounds: 0,
  },
];

/** Ofertas: costo unitario + tamaño de caja por proveedor y producto (PLAN §4.2). */
export const OFFERS: Record<string, Record<string, { unitCost: number; packSize: number }>> = {
  PRINCIPAL: {
    REFRESCO: { unitCost: 10.5, packSize: 6 },
    PAN: { unitCost: 0.5, packSize: 10 },
    LECHE: { unitCost: 5.6, packSize: 6 },
    SNACKS: { unitCost: 1.5, packSize: 24 },
    HUEVOS: { unitCost: 27.0, packSize: 3 },
    DETERG: { unitCost: 8.0, packSize: 12 },
  },
  LUCHO: {
    REFRESCO: { unitCost: 13.0, packSize: 1 },
    PAN: { unitCost: 0.65, packSize: 1 },
    LECHE: { unitCost: 7.8, packSize: 1 },
    SNACKS: { unitCost: 2.0, packSize: 1 },
    HUEVOS: { unitCost: 34.0, packSize: 1 },
    DETERG: { unitCost: 10.5, packSize: 1 },
  },
};

/** Costo con el que se valora el inventario heredado (= costo de La Principal). */
export function initialLotCost(sku: string): number {
  return OFFERS.PRINCIPAL[sku].unitCost;
}

// ------------------------------------------------------ Guion de las 5 rondas
export type SupplyConfigSeed = {
  luchoCap: number; // tope por producto en Don Lucho
  principalAvailable: boolean; // ¿acepta pedidos el camión?
  deliveryFactor: number; // fracción que llega de lo pedido al camión
};

export type RoundScript = {
  roundNumber: number;
  title: string;
  event: { headline: string; description: string; icon: string };
  supply: SupplyConfigSeed;
  facilitatorNotes: string;
  /** Multiplicador de demanda por SKU respecto a baseDemand (1 = normal). */
  multipliers: Record<string, number>;
};

const LUCHO_CAP = 40;

export const ROUND_SCRIPTS: RoundScript[] = [
  {
    roundNumber: 1,
    title: "La primera semana",
    event: {
      headline: "Semana normal — conozcan su tienda",
      description: "Hereden la tienda de Doña Peta. Revisen el inventario y el cuaderno.",
      icon: "inicio",
    },
    supply: { luchoCap: LUCHO_CAP, principalAvailable: false, deliveryFactor: 1 },
    facilitatorNotes: "El camión 'ya pasó' esta semana (gris). Se sobrevive con la herencia + compras chicas a Don Lucho.",
    multipliers: {},
  },
  {
    roundNumber: 2,
    title: "Llega el camión",
    event: {
      headline: "Hace calorcito — y hay un afiche pegado",
      description: "KERMESSE la próxima semana: puede venderse hasta el doble en bebidas y snacks.",
      icon: "camion",
    },
    supply: { luchoCap: LUCHO_CAP, principalAvailable: true, deliveryFactor: 1 },
    facilitatorNotes: "Concepto: lead time. Lo que pidan hoy a La Principal llega justo para la kermesse de R3.",
    multipliers: { REFRESCO: 1.15 },
  },
  {
    roundNumber: 3,
    title: "La kermesse",
    event: {
      headline: "¡KERMESSE en el barrio!",
      description: "El barrio se llena. Vuela el refresco, los snacks y el pan.",
      icon: "fiesta",
    },
    supply: { luchoCap: LUCHO_CAP, principalAvailable: true, deliveryFactor: 1 },
    facilitatorNotes: "Clímax. Quien anticipó en R2 cubre el pico barato; quien no, rescata caro con Lucho (capado).",
    multipliers: { REFRESCO: 1.8, SNACKS: 1.7, PAN: 1.4, HUEVOS: 1.2 },
  },
  {
    roundNumber: 4,
    title: "El camión se plantó",
    event: {
      headline: "Semana tranquila… y el camión se plantó en la carretera",
      description: "Llega la MITAD de lo que pediste (te devuelven la plata del resto). A Don Lucho también le queda poco: máximo 25 por producto.",
      icon: "averia",
    },
    supply: { luchoCap: 25, principalAvailable: true, deliveryFactor: 0.5 },
    facilitatorNotes: "Concepto: colchón (stock de seguridad). Quien tenía reserva aguanta; quien iba justo, se queda corto.",
    multipliers: { REFRESCO: 0.85, SNACKS: 0.85 },
  },
  {
    roundNumber: 5,
    title: "Vuelve Doña Peta",
    event: {
      headline: "Vuelve Doña Peta — se cierra la caja",
      description: "El inventario que quede el último día vale la mitad. Última compra fina; el camión ya no llegaría.",
      icon: "cierre",
    },
    supply: { luchoCap: LUCHO_CAP, principalAvailable: false, deliveryFactor: 1 },
    facilitatorNotes: "Fin de horizonte: demasiado inventario el último día es plata perdida. La Principal bloqueada.",
    multipliers: {},
  },
];

// ------------------------------------------------- Generación del histórico
export const HISTORY_WEEKS = 8; // -8 .. -1
export const HISTORY_CONFIG = {
  noiseAmplitude: 0.2, // ±20%
  trendPerWeek: 0.015, // +1.5%/semana hacia el presente
  /** Semana marcada con pico (índice negativo). */
  markedWeek: -5,
  markedNote: "Festival del colegio",
  markedMultipliers: { REFRESCO: 1.3, SNACKS: 1.3 } as Record<string, number>,
  lostSalesWeekChance: 0.1,
};

export const HINT_ROUND_CONCEPTS: Record<number, string> = {
  1: "Pronóstico",
  2: "Lead time",
  3: "Quiebre / nivel de servicio",
  4: "Colchón (stock de seguridad)",
  5: "Fin de horizonte",
};

// Formateadores para la UI.
import { CURRENCY } from "./constants";

/** Formatea un monto como "Bs 250" (sin decimales si es entero). */
export function money(n: number, currency = CURRENCY): string {
  const rounded = Math.round(n * 100) / 100;
  const isInt = Number.isInteger(rounded);
  const formatted = rounded.toLocaleString("es-BO", {
    minimumFractionDigits: isInt ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

/** Formatea 0..1 como porcentaje entero ("86%"). */
export function percent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** Número entero con separador de miles. */
export function int(n: number): string {
  return Math.round(n).toLocaleString("es-BO");
}

/** Signo explícito para ganancias/pérdidas ("+Bs 250" / "−Bs 40"). */
export function signedMoney(n: number, currency = CURRENCY): string {
  if (n < 0) return `−${money(-n, currency)}`;
  return `+${money(n, currency)}`;
}

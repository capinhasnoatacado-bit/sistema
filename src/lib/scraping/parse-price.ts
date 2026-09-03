/**
 * Converte um valor em texto (formato brasileiro, ex: "R$ 1.234,56") em
 * número. Retorna `null` se não conseguir reconhecer um preço no texto.
 */
export function parsePtBrCurrency(text: string | number | null | undefined): number | null {
  if (text === null || text === undefined) return null;
  if (typeof text === "number") return Number.isFinite(text) ? text : null;

  const match = text.match(/-?\d[\d.,\s]*\d|-?\d/);
  if (!match) return null;

  let raw = match[0].replace(/\s/g, "");
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");

  if (hasComma) {
    // Formato brasileiro: "." separa milhar (se houver), "," separa decimal.
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    // Sem vírgula, o ponto é ambíguo: "9.90" (decimal, comum em JSON-LD) vs
    // "1.234" (milhar, comum em texto solto). Milhar sempre tem 3 dígitos
    // após o ponto; decimal tem no máximo 2 — usamos isso pra decidir.
    const parts = raw.split(".");
    const isDecimal = parts.length === 2 && parts[1].length <= 2;
    if (!isDecimal) raw = raw.replace(/\./g, "");
  }

  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

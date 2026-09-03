/** Pausa simples, usada entre requisições ao site do concorrente pra não sobrecarregá-lo. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

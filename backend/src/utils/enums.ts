/**
 * Type guard para enums gerados pelo Prisma (objetos { VALOR: "VALOR" }).
 * Ex.: isEnumValue(Difficulty, input) restringe `input` ao tipo Difficulty.
 */
export function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === "string" && Object.values(enumObject).includes(value);
}

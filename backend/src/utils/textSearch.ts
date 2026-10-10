import { Prisma } from "@prisma/client";
import { prisma } from "../config/database";

/** Máximo de resultados considerados numa busca textual (a paginação acontece sobre eles). */
export const MAX_SEARCH_RESULTS = 1000;

/**
 * Converte o texto digitado em uma consulta do Postgres: cada palavra vira um prefixo
 * ("progra" encontra "programação") e todas precisam aparecer. Retorna null se não houver palavras.
 */
export function toPrefixTsQuery(input: string): string | null {
  const words = input.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const unique = [...new Set(words)].slice(0, 10);
  return unique.length ? unique.map((word) => `${word}:*`).join(" & ") : null;
}

/** Escapa os curingas do LIKE para buscar o texto literalmente. */
export function likePattern(input: string): string {
  return `%${input.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * IDs que casam com a busca, do mais para o menos relevante. Combina a busca textual (radicais em
 * português, sem acentos, título com peso maior) com um "contém" no título para trechos de palavras.
 */
export async function rankedIds(table: "Course" | "Lesson", query: string, limit = MAX_SEARCH_RESULTS): Promise<string[]> {
  if (!query.trim()) return [];
  const tsquery = toPrefixTsQuery(query);
  const like = likePattern(query);
  const tableSql = Prisma.raw(`"${table}"`);
  const textMatch = tsquery
    ? Prisma.sql`"searchVector" @@ to_tsquery('portuguese', f_unaccent(${tsquery}))`
    : Prisma.sql`FALSE`;
  const rank = tsquery
    ? Prisma.sql`ts_rank_cd("searchVector", to_tsquery('portuguese', f_unaccent(${tsquery})))`
    : Prisma.sql`0::real`; // um "0" literal no ORDER BY seria lido como posição de coluna
  const titleMatch = Prisma.sql`f_unaccent("title") ILIKE f_unaccent(${like})`;

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM ${tableSql}
    WHERE ${textMatch} OR ${titleMatch}
    ORDER BY (${titleMatch}) DESC, ${rank} DESC, "createdAt" DESC
    LIMIT ${limit}`;
  return rows.map((row) => row.id);
}

/** IDs das notas do usuário que contêm o texto, sem diferenciar acentos nem maiúsculas. */
export async function matchingNoteIds(userId: string, query: string, limit = 50): Promise<string[]> {
  if (!query.trim()) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Note"
    WHERE "userId" = ${userId} AND f_unaccent("content") ILIKE f_unaccent(${likePattern(query)})
    ORDER BY "updatedAt" DESC
    LIMIT ${limit}`;
  return rows.map((row) => row.id);
}

/** Reordena registros conforme a lista de IDs (a ordem de relevância). */
export function sortByIds<T extends { id: string }>(records: T[], ids: string[]): T[] {
  const position = new Map(ids.map((id, index) => [id, index]));
  return [...records].sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0));
}

/**
 * Pagina uma busca por relevância respeitando filtros adicionais: `filterIds` recebe os IDs
 * encontrados e devolve os que passam nos demais filtros.
 */
export async function paginateRanked(
  ids: string[],
  filterIds: (ids: string[]) => Promise<string[]>,
  page: number,
  limit: number
) {
  const allowed = new Set(await filterIds(ids));
  const ordered = ids.filter((id) => allowed.has(id));
  return { pageIds: ordered.slice((page - 1) * limit, page * limit), total: ordered.length };
}

/**
 * Copia os dados de um banco SQLite da versão anterior do Educarize para o PostgreSQL.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... npm run migrate:sqlite -- caminho/para/dev.db [--force]
 *
 * Pré-requisitos:
 *   - O SQLite precisa estar na última versão do schema SQLite (todas as migrações antigas aplicadas,
 *     incluindo "auth_sessions_and_email_tokens" e "performance_indexes").
 *   - O PostgreSQL de destino já deve ter as migrações aplicadas (`npx prisma migrate deploy`) e estar vazio
 *     (use --force para copiar mesmo assim; registros já existentes são ignorados).
 */
import { Prisma, PrismaClient } from "@prisma/client";

type Row = Record<string, unknown>;
type SqliteDatabase = {
  prepare(sql: string): { all(...params: unknown[]): Row[]; get(...params: unknown[]): Row | undefined };
  close(): void;
};

/** Ordem de cópia respeitando as chaves estrangeiras. */
const TABLE_ORDER = [
  "User",
  "CourseCategory",
  "Course",
  "Module",
  "Lesson",
  "LessonAttachment",
  "Quiz",
  "QuizQuestion",
  "QuizAttempt",
  "Enrollment",
  "UserProgress",
  "LessonComment",
  "Certificate",
  "ActivityLog",
  "Favorite",
  "Tag",
  "CourseTag",
  "Note",
  "CourseReview",
  "Notification",
  "Message",
  "LearningPath",
  "LearningPathCourse",
  "LearningPathEnrollment",
  "RefreshToken",
  "AuthToken",
] as const;

const BATCH_SIZE = 500;

function openSqlite(file: string): SqliteDatabase {
  // node:sqlite vem com o Node 22+ (sem dependência nativa extra).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (f: string, o?: object) => SqliteDatabase };
  return new DatabaseSync(file, { readOnly: true });
}

/** Converte um valor do SQLite (como o Prisma gravava) para o tipo do campo no PostgreSQL. */
function convert(value: unknown, field: Prisma.DMMF.Field): unknown {
  if (value === null || value === undefined) return value;
  switch (field.type) {
    case "DateTime":
      return new Date(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : (value as string | number));
    case "Boolean":
      return value === 1 || value === "1" || value === true;
    case "Json":
      return typeof value === "string" ? JSON.parse(value) : value;
    case "Int":
      return Number(value);
    default:
      return value;
  }
}

function assertLatestSqliteSchema(db: SqliteDatabase) {
  const hasTable = (name: string) =>
    !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  const hasColumn = (table: string, column: string) =>
    db.prepare(`PRAGMA table_info("${table}")`).all().some((c) => c.name === column);

  if (!hasTable("AuthToken") || !hasColumn("Certificate", "courseTitle") || !hasColumn("User", "emailVerifiedAt")) {
    throw new Error(
      "O SQLite não está na última versão do schema SQLite. Aplique as migrações da versão anterior " +
        "(commit 3f75413: `git checkout 3f75413 -- backend/prisma` e `npx prisma migrate deploy` com o " +
        "DATABASE_URL do SQLite) e rode este script novamente."
    );
  }
}

/** Comentários referenciam o comentário pai: copia primeiro os que não dependem de outros ainda não copiados. */
function orderComments(rows: Row[]): Row[] {
  const ordered: Row[] = [];
  const inserted = new Set<unknown>();
  let pending = rows;
  while (pending.length > 0) {
    const ready = pending.filter((r) => !r.parentId || inserted.has(r.parentId));
    if (ready.length === 0) {
      // Pais ausentes (dados inconsistentes): copia sem o vínculo.
      ready.push(...pending.map((r) => ({ ...r, parentId: null })));
    }
    ready.forEach((r) => inserted.add(r.id));
    ordered.push(...ready);
    pending = pending.filter((r) => !ready.some((x) => x.id === r.id));
  }
  return ordered;
}

async function main() {
  const [file, ...flags] = process.argv.slice(2);
  if (!file) {
    console.error("Uso: npm run migrate:sqlite -- caminho/para/dev.db [--force]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL?.startsWith("postgres")) {
    console.error("DATABASE_URL precisa apontar para o PostgreSQL de destino.");
    process.exit(1);
  }

  const sqlite = openSqlite(file);
  const prisma = new PrismaClient();

  try {
    assertLatestSqliteSchema(sqlite);

    if (!flags.includes("--force") && (await prisma.user.count()) > 0) {
      throw new Error("O PostgreSQL de destino já tem dados. Use --force para copiar mesmo assim.");
    }

    const models = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]));

    for (const table of TABLE_ORDER) {
      const model = models.get(table);
      if (!model) throw new Error(`Modelo ${table} não encontrado no schema`);

      const scalarFields = model.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
      let rows = sqlite.prepare(`SELECT * FROM "${table}"`).all();
      if (table === "LessonComment") rows = orderComments(rows);

      const data = rows.map((row) =>
        Object.fromEntries(scalarFields.filter((f) => f.name in row).map((f) => [f.name, convert(row[f.name], f)]))
      );

      const delegate = (prisma as unknown as Record<string, { createMany(args: object): Promise<{ count: number }> }>)[
        table.charAt(0).toLowerCase() + table.slice(1)
      ];

      let copied = 0;
      for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const result = await delegate.createMany({ data: data.slice(i, i + BATCH_SIZE), skipDuplicates: true });
        copied += result.count;
      }
      console.log(`${table.padEnd(24)} ${String(copied).padStart(6)} de ${rows.length}`);
    }

    console.log("\nCópia concluída.");
  } finally {
    sqlite.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`\nErro: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});

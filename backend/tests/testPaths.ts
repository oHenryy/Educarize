import os from "os";
import path from "path";

const root = path.join(os.tmpdir(), `educarize-tests-${process.pid}`);

/** Banco PostgreSQL usado nos testes (o docker-compose do projeto sobe um em localhost:5432). */
const baseUrl = process.env.TEST_DATABASE_URL || "postgresql://educarize:educarize@localhost:5432/educarize";

/** Cada execução usa um schema próprio, criado e removido pelos testes. */
const schema = `test_${process.pid}`;

const withSchema = (url: string, name: string) => {
  const parsed = new URL(url);
  parsed.searchParams.set("schema", name);
  return parsed.toString();
};

export const testPaths = {
  root,
  schema,
  databaseUrl: withSchema(baseUrl, schema),
  certificates: path.join(root, "certificates"),
  uploads: path.join(root, "uploads"),
};

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DeleteBucketCommand, DeleteObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createS3Client, S3Storage } from "../src/storage/fileStorage";

/** Silo do docker compose (ou outro storage S3 indicado por TEST_S3_*). */
const s3 = {
  endpoint: process.env.TEST_S3_ENDPOINT || "http://localhost:9000",
  accessKeyId: process.env.TEST_S3_ACCESS_KEY_ID || "educarize",
  secretAccessKey: process.env.TEST_S3_SECRET_ACCESS_KEY || "educarize-silo",
  region: "us-east-1",
  forcePathStyle: true,
  bucket: `educarize-test-${process.pid}`,
  createBucket: true,
};

async function s3Available(client: S3Client): Promise<boolean> {
  try {
    await client.send(new ListObjectsV2Command({ Bucket: "probe-inexistente" }));
    return true;
  } catch (error) {
    // Responder (mesmo com "bucket não existe") prova que o servidor está no ar.
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode) return true;
    if (process.env.CI) throw new Error(`Storage S3 indisponível em ${s3.endpoint} (obrigatório no CI)`);
    console.warn(`[s3-storage.test] Storage S3 indisponível em ${s3.endpoint}: suíte pulada. Rode "docker compose up -d".`);
    return false;
  }
}

describe("storage S3 (Silo)", () => {
  const client = createS3Client(s3);
  const storage = new S3Storage(client, s3.bucket);
  let available = false;

  beforeAll(async () => {
    available = await s3Available(client);
  });

  afterAll(async () => {
    if (!available) return;
    const listed = await client.send(new ListObjectsV2Command({ Bucket: s3.bucket })).catch(() => null);
    for (const object of listed?.Contents ?? []) {
      await client.send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: object.Key! }));
    }
    await client.send(new DeleteBucketCommand({ Bucket: s3.bucket })).catch(() => undefined);
    client.destroy();
  });

  it("sem permissão de criar, um bucket inexistente é um erro; com ela, é criado", async (ctx) => {
    if (!available) ctx.skip();
    await expect(storage.verify()).rejects.toThrow();
    await storage.verify({ createIfMissing: true });
    await storage.verify(); // agora existe
  });

  it("grava, lê, confere e apaga arquivos", async (ctx) => {
    if (!available) ctx.skip();
    await storage.verify({ createIfMissing: true });
    const body = Buffer.from("conteúdo de teste ✓");

    await storage.put("attachments/teste.txt", body, "text/plain; charset=utf-8");
    expect(await storage.exists("attachments/teste.txt")).toBe(true);

    const stream = await storage.get("attachments/teste.txt");
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk as Buffer);
    expect(Buffer.concat(chunks).equals(body)).toBe(true);

    await storage.delete("attachments/teste.txt");
    expect(await storage.exists("attachments/teste.txt")).toBe(false);
    expect(await storage.get("attachments/teste.txt")).toBeNull();
    await storage.delete("attachments/teste.txt"); // apagar de novo não é erro
  });

  it("recusa chaves fora do padrão gerado pelo backend", async (ctx) => {
    if (!available) ctx.skip();
    for (const key of ["../fora.txt", "covers/../../x", "sem-pasta.txt", "covers/a b.png"]) {
      await expect(storage.put(key, Buffer.from("x"), "text/plain")).rejects.toThrow(/Chave de arquivo inválida/);
    }
  });
});

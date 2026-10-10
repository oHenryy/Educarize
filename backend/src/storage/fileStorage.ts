import fs from "fs";
import path from "path";
import { Readable } from "stream";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { config } from "../config/env";

/**
 * Onde ficam os arquivos enviados e os certificados. As chaves são geradas pelo backend
 * (ex.: "covers/<id>.png"), nunca vêm do usuário.
 */
export interface FileStorage {
  readonly kind: "local" | "s3";
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Conteúdo do arquivo, ou null se ele não existir. */
  get(key: string): Promise<Readable | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** Confere se o storage está acessível (no S3, cria o bucket se `createIfMissing`). */
  verify(options?: { createIfMissing?: boolean }): Promise<void>;
}

const VALID_KEY = /^[a-z]+\/[A-Za-z0-9._-]+$/;

function assertValidKey(key: string): void {
  if (!VALID_KEY.test(key) || key.includes("..")) {
    throw new Error(`Chave de arquivo inválida: ${key}`);
  }
}

/** Disco local: padrão em desenvolvimento e para uma única instância. */
export class LocalStorage implements FileStorage {
  readonly kind = "local" as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  private pathFor(key: string): string {
    assertValidKey(key);
    return path.join(this.root, key);
  }

  async put(key: string, body: Buffer): Promise<void> {
    const file = this.pathFor(key);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, body);
  }

  async get(key: string): Promise<Readable | null> {
    const file = this.pathFor(key);
    return (await this.exists(key)) ? fs.createReadStream(file) : null;
  }

  async exists(key: string): Promise<boolean> {
    try {
      return (await fs.promises.stat(this.pathFor(key))).isFile();
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await fs.promises.rm(this.pathFor(key), { force: true });
  }

  async verify(): Promise<void> {
    await fs.promises.mkdir(this.root, { recursive: true });
    await fs.promises.access(this.root, fs.constants.W_OK);
  }
}

/** Qualquer storage compatível com S3 (AWS S3, MinIO, Cloudflare R2, DigitalOcean Spaces...). */
export class S3Storage implements FileStorage {
  readonly kind = "s3" as const;

  constructor(
    private readonly client: S3Client,
    readonly bucket: string
  ) {}

  async verify({ createIfMissing = false } = {}): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (!isNotFound(error) || !createIfMissing) throw error;
      // Buckets novos são privados: os arquivos só saem pela API, que confere o acesso.
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    assertValidKey(key);
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async get(key: string): Promise<Readable | null> {
    assertValidKey(key);
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return result.Body instanceof Readable ? result.Body : null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const body = await this.get(key);
    body?.destroy();
    return body !== null;
  }

  async delete(key: string): Promise<void> {
    assertValidKey(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

function isNotFound(error: unknown): boolean {
  const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return err?.name === "NoSuchKey" || err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404;
}

/** Cliente S3 a partir da configuração (AWS S3, Silo/MinIO, R2...). */
export function createS3Client(s3: typeof config.s3): S3Client {
  return new S3Client({
    region: s3.region,
    endpoint: s3.endpoint || undefined,
    forcePathStyle: s3.forcePathStyle,
    credentials: s3.accessKeyId ? { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey } : undefined,
  });
}

function createStorage(): FileStorage {
  const { s3 } = config;
  if (!s3.bucket) return new LocalStorage(config.uploadDir);

  return new S3Storage(createS3Client(s3), s3.bucket);
}

export const storage: FileStorage = createStorage();

/** Erros de conexão do SDK costumam vir sem mensagem: usa o código (ex.: ECONNREFUSED) ou o nome. */
function describeError(error: unknown): string {
  const err = error as { message?: string; code?: string; name?: string; errors?: { code?: string }[] };
  return err?.message || err?.code || err?.errors?.[0]?.code || err?.name || String(error);
}

/** Usado na inicialização do servidor: avisa logo se o storage estiver inacessível. */
export async function verifyStorage(): Promise<void> {
  const where = storage instanceof S3Storage ? `bucket "${storage.bucket}" em ${config.s3.endpoint || "AWS S3"}` : `pasta ${path.resolve(config.uploadDir)}`;
  try {
    await storage.verify({ createIfMissing: config.s3.createBucket });
    console.log(`Arquivos: ${where}`);
  } catch (error) {
    console.error(
      `Storage de arquivos inacessível (${where}). Uploads e certificados vão falhar até isso ser corrigido.` +
        (storage instanceof S3Storage ? " Confira S3_* no .env (com docker compose, rode \"docker compose up -d\")." : ""),
      describeError(error)
    );
  }
}

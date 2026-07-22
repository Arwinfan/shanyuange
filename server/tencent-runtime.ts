import mysql, { type Pool, type PoolOptions, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
import COS from "cos-nodejs-sdk-v5";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

type RuntimeEnv = Record<string, string | undefined>;

function readEnv(env: RuntimeEnv, ...keys: string[]) {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readNumber(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatMysqlDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (part: number, width = 2) => String(part).padStart(width, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
}

function normalizeBindValue(value: unknown) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return formatMysqlDate(value);
  }
  return value;
}

function normalizeSql(sql: string) {
  return sql
    .replace(/\bINSERT\s+OR\s+IGNORE\b/gi, "INSERT IGNORE")
    .replace(/\bUPDATE\s+OR\s+IGNORE\b/gi, "UPDATE IGNORE")
    .replace(/date\('now'\)/gi, "CURRENT_DATE()");
}


function paginationNumber(value: unknown, fallback: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(0, parsed));
}

function prepareMysqlStatement(sql: string, values: unknown[]) {
  const normalizedSql = normalizeSql(sql);
  const match = normalizedSql.match(/\s+LIMIT\s+\?\s+OFFSET\s+\?\s*;?\s*$/i);
  if (!match) return { sql: normalizedSql, values };

  // MySQL 8.4 on the target server rejects LIMIT/OFFSET placeholders in native prepared statements.
  // These values originate from bounded page/pageSize inputs and are re-validated before interpolation.
  const limit = paginationNumber(values.at(-2), 20, 100);
  const offset = paginationNumber(values.at(-1), 0, 1_000_000);
  return {
    sql: normalizedSql.slice(0, match.index).trimEnd() + " LIMIT " + limit + " OFFSET " + offset,
    values: values.slice(0, -2),
  };
}

function normalizeDateValue(value: unknown) {
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(value)) {
    return `${value.replace(" ", "T")}Z`;
  }
  return value;
}

function normalizeRow(row: RowDataPacket | Record<string, unknown> | undefined | null) {
  if (!row) return row ?? null;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, normalizeDateValue(value)]));
}

function mysqlOptions(env: RuntimeEnv): PoolOptions | null {
  const connectionUrl = readEnv(env, "MYSQL_URL", "DATABASE_URL");
  const common: PoolOptions = {
    connectionLimit: readNumber(readEnv(env, "MYSQL_CONNECTION_LIMIT"), 10),
    connectTimeout: readNumber(readEnv(env, "MYSQL_CONNECT_TIMEOUT_MS"), 10_000),
    waitForConnections: true,
    queueLimit: 0,
    timezone: "Z",
    dateStrings: true,
    charset: "utf8mb4_unicode_ci",
  };

  if (connectionUrl) {
    const url = new URL(connectionUrl);
    return {
      ...common,
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, "")),
      ssl: readEnv(env, "MYSQL_SSL").toLowerCase() === "true" ? { rejectUnauthorized: readEnv(env, "MYSQL_SSL_REJECT_UNAUTHORIZED").toLowerCase() !== "false" } : undefined,
    };
  }

  const host = readEnv(env, "MYSQL_HOST", "DB_HOST");
  const user = readEnv(env, "MYSQL_USER", "DB_USER");
  const database = readEnv(env, "MYSQL_DATABASE", "DB_NAME");
  if (!host || !user || !database) return null;
  return {
    ...common,
    host,
    port: readNumber(readEnv(env, "MYSQL_PORT", "DB_PORT"), 3306),
    user,
    password: readEnv(env, "MYSQL_PASSWORD", "DB_PASSWORD"),
    database,
    ssl: readEnv(env, "MYSQL_SSL").toLowerCase() === "true" ? { rejectUnauthorized: readEnv(env, "MYSQL_SSL_REJECT_UNAUTHORIZED").toLowerCase() !== "false" } : undefined,
  };
}

let pool: Pool | null = null;
let poolIdentity = "";

function getPool(env: RuntimeEnv) {
  const options = mysqlOptions(env);
  if (!options) return null;
  const identity = JSON.stringify({ host: options.host, port: options.port, user: options.user, database: options.database });
  if (!pool || poolIdentity !== identity) {
    pool?.end().catch(() => {});
    pool = mysql.createPool(options);
    poolIdentity = identity;
  }
  return pool;
}

class MysqlStatement {
  private values: unknown[] = [];

  constructor(private readonly mysqlPool: Pool, private readonly sql: string) {}

  bind(...values: unknown[]) {
    this.values = values.map(normalizeBindValue);
    return this;
  }

  private async execute() {
    const statement = prepareMysqlStatement(this.sql, this.values);
    return this.mysqlPool.execute(statement.sql, statement.values as any[]);
  }

  async first<T = Record<string, unknown>>() {
    const [rows] = await this.execute();
    if (!Array.isArray(rows)) return null;
    return normalizeRow(rows[0] as RowDataPacket | undefined) as T | null;
  }

  async all<T = Record<string, unknown>>() {
    const [rows] = await this.execute();
    const results = Array.isArray(rows) ? rows.map((row) => normalizeRow(row as RowDataPacket)) : [];
    return { results: results as T[] };
  }

  async run() {
    const [result] = await this.execute();
    const header = result as ResultSetHeader;
    return {
      success: true,
      meta: {
        changes: Number(header.affectedRows || 0),
        last_row_id: Number(header.insertId || 0),
      },
    };
  }
}

export function createMysqlD1Adapter(env: RuntimeEnv) {
  const mysqlPool = getPool(env);
  if (!mysqlPool) return null;
  return {
    prepare(sql: string) {
      return new MysqlStatement(mysqlPool, sql);
    },
  };
}

type CosPutOptions = { httpMetadata?: { contentType?: string } };

class CosObjectStore {
  private readonly client: COS;

  constructor(private readonly env: RuntimeEnv) {
    this.client = new COS({
      SecretId: readEnv(env, "COS_SECRET_ID"),
      SecretKey: readEnv(env, "COS_SECRET_KEY"),
    });
  }

  private get common() {
    return {
      Bucket: readEnv(this.env, "COS_BUCKET"),
      Region: readEnv(this.env, "COS_REGION"),
    };
  }

  async put(key: string, value: string | Buffer, options?: CosPutOptions) {
    await new Promise<void>((resolve, reject) => {
      this.client.putObject({
        ...this.common,
        Key: key,
        Body: value,
        ContentType: options?.httpMetadata?.contentType || "application/octet-stream",
      }, (error) => error ? reject(error) : resolve());
    });
  }

  async get(key: string) {
    const result = await new Promise<any>((resolve, reject) => {
      this.client.getObject({ ...this.common, Key: key }, (error, data) => error ? reject(error) : resolve(data));
    });
    return {
      text: async () => {
        const body = result?.Body;
        if (Buffer.isBuffer(body)) return body.toString("utf8");
        if (typeof body === "string") return body;
        return Buffer.from(body || "").toString("utf8");
      },
    };
  }

  async delete(key: string) {
    await new Promise<void>((resolve, reject) => {
      this.client.deleteObject({ ...this.common, Key: key }, (error) => error ? reject(error) : resolve());
    });
  }
}

function localObjectPath(root: string, key: string) {
  const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedKey || normalizedKey.split("/").includes("..")) {
    throw new Error("Invalid object key");
  }

  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(resolvedRoot, normalizedKey);
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Object key escapes storage directory");
  }
  return resolvedTarget;
}

class LocalObjectStore {
  constructor(private readonly root: string) {}

  async put(key: string, value: string | Buffer) {
    const target = localObjectPath(this.root, key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, value);
  }

  async get(key: string) {
    const target = localObjectPath(this.root, key);
    const content = await readFile(target);
    return { text: async () => content.toString("utf8") };
  }

  async delete(key: string) {
    const target = localObjectPath(this.root, key);
    await rm(target, { force: true });
  }
}
export function createCosR2Adapter(env: RuntimeEnv) {
  const secretId = readEnv(env, "COS_SECRET_ID");
  const secretKey = readEnv(env, "COS_SECRET_KEY");
  const bucket = readEnv(env, "COS_BUCKET");
  const region = readEnv(env, "COS_REGION");
  if (!secretId || !secretKey || !bucket || !region) return null;
  return new CosObjectStore(env);
}

export function createLocalR2Adapter(env: RuntimeEnv) {
  const directory = readEnv(env, "LOCAL_STORAGE_DIR");
  return directory ? new LocalObjectStore(directory) : null;
}

export function createTencentRuntimeEnv() {
  const processEnv = process.env as RuntimeEnv;
  const cos = createCosR2Adapter(processEnv);
  const local = createLocalR2Adapter(processEnv);
  return {
    ...processEnv,
    DB: createMysqlD1Adapter(processEnv),
    R2: cos || local,
    STORAGE_PROVIDER: cos ? "cos" : local ? "local" : "unconfigured",
  };
}
export async function closeTencentRuntime() {
  if (pool) {
    await pool.end();
    pool = null;
    poolIdentity = "";
  }
}
/**
 * SqliteAdapter — Implements IDbAdapter using better-sqlite3.
 *
 * Translates Prisma-style query patterns (findMany, findUnique, create, etc.)
 * into raw SQL against a local SQLite database. This lets the same Express
 * services run in local camp mode with zero code changes.
 *
 * Design decisions:
 *  - Sync metadata columns (_version, _synced, _deleted, _device_id) are added
 *    to every table for offline→cloud synchronization.
 *  - IDs are always UUID strings, generated client-side.
 *  - Dates stored as ISO-8601 text strings.
 *  - JSON relations (include) are resolved via extra queries (not JOINs) to
 *    keep the implementation simple and match Prisma's behavior.
 */
import Database from "better-sqlite3";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import type {
  IDbAdapter,
  IModelRepo,
  FindManyOptions,
  FindUniqueOptions,
  WhereCondition,
  IncludeRelation,
  GroupByOptions,
  OrderBy,
} from "./db-adapter";
import { logger } from "../utils/logger";
import { bootstrapDb } from "../config/camp-bootstrap";

// ── Relation metadata ──────────────────────────────────────────────────
// Maps model names to their SQL table and relation definitions so the
// adapter can resolve `include:` just like Prisma does.

interface RelationDef {
  /** The foreign key column on THIS table (e.g. "patientId") */
  fk: string;
  /** The target table name in SQLite */
  table: string;
  /** The target model name (key in MODELS) */
  model: string;
  /** "one" = belongsTo, "many" = hasMany */
  type: "one" | "many";
}

interface ModelDef {
  table: string;
  relations: Record<string, RelationDef>;
  /** Unique constraints (array of column name arrays) */
  uniques?: string[][];
}

const MODELS: Record<string, ModelDef> = {
  user: {
    table: "users",
    relations: {
      role: { fk: "roleId", table: "roles", model: "role", type: "one" },
      transactions: { fk: "userId", table: "medicine_transactions", model: "medicineTransaction", type: "many" },
      doctorNotes: { fk: "doctorId", table: "doctor_notes", model: "doctorNote", type: "many" },
      prescriptions: { fk: "doctorId", table: "prescriptions", model: "prescription", type: "many" },
      reports: { fk: "generatedById", table: "reports", model: "report", type: "many" },
      auditLogs: { fk: "userId", table: "audit_logs", model: "auditLog", type: "many" },
      notifications: { fk: "userId", table: "notifications", model: "notification", type: "many" },
    },
  },
  role: {
    table: "roles",
    relations: {
      users: { fk: "roleId", table: "users", model: "user", type: "many" },
    },
    uniques: [["name"]],
  },
  permission: {
    table: "permissions",
    relations: {},
    uniques: [["name"]],
  },
  camp: {
    table: "camps",
    relations: {
      prescriptions: { fk: "campId", table: "prescriptions", model: "prescription", type: "many" },
      inventory: { fk: "campId", table: "inventory", model: "inventory", type: "many" },
      transactions: { fk: "campId", table: "medicine_transactions", model: "medicineTransaction", type: "many" },
      doctorNotes: { fk: "campId", table: "doctor_notes", model: "doctorNote", type: "many" },
      feedback: { fk: "campId", table: "feedback", model: "feedback", type: "many" },
      reports: { fk: "campId", table: "reports", model: "report", type: "many" },
    },
    uniques: [["campCode"]],
  },
  patient: {
    table: "patients",
    relations: {
      family: { fk: "familyId", table: "families", model: "family", type: "one" },
      vitals: { fk: "patientId", table: "vitals", model: "vitals", type: "many" },
      prescriptions: { fk: "patientId", table: "prescriptions", model: "prescription", type: "many" },
      followUps: { fk: "patientId", table: "follow_ups", model: "followUp", type: "many" },
      feedback: { fk: "patientId", table: "feedback", model: "feedback", type: "many" },
      diseases: { fk: "", table: "_patient_diseases", model: "disease", type: "many" },
      allergies: { fk: "", table: "_patient_allergies", model: "allergy", type: "many" },
    },
  },
  family: {
    table: "families",
    relations: {
      patients: { fk: "familyId", table: "patients", model: "patient", type: "many" },
      healthCard: { fk: "healthCardId", table: "health_cards", model: "healthCard", type: "one" },
    },
  },
  healthCard: {
    table: "health_cards",
    relations: {
      family: { fk: "healthCardId", table: "families", model: "family", type: "one" },
    },
    uniques: [["cardNumber"]],
  },
  vitals: {
    table: "vitals",
    relations: {
      patient: { fk: "patientId", table: "patients", model: "patient", type: "one" },
    },
  },
  disease: {
    table: "diseases",
    relations: {
      patients: { fk: "", table: "_patient_diseases", model: "patient", type: "many" },
    },
    uniques: [["name"]],
  },
  allergy: {
    table: "allergies",
    relations: {
      patients: { fk: "", table: "_patient_allergies", model: "patient", type: "many" },
    },
    uniques: [["name"]],
  },
  prescription: {
    table: "prescriptions",
    relations: {
      doctor: { fk: "doctorId", table: "users", model: "user", type: "one" },
      patient: { fk: "patientId", table: "patients", model: "patient", type: "one" },
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
      medicines: { fk: "prescriptionId", table: "prescription_medicines", model: "prescriptionMedicine", type: "many" },
      doctorNotes: { fk: "prescriptionId", table: "doctor_notes", model: "doctorNote", type: "many" },
    },
  },
  prescriptionMedicine: {
    table: "prescription_medicines",
    relations: {
      prescription: { fk: "prescriptionId", table: "prescriptions", model: "prescription", type: "one" },
      medicine: { fk: "medicineId", table: "medicines", model: "medicine", type: "one" },
    },
  },
  medicine: {
    table: "medicines",
    relations: {
      category: { fk: "categoryId", table: "medicine_categories", model: "medicineCategory", type: "one" },
      prescriptions: { fk: "medicineId", table: "prescription_medicines", model: "prescriptionMedicine", type: "many" },
      inventory: { fk: "medicineId", table: "inventory", model: "inventory", type: "many" },
      transactions: { fk: "medicineId", table: "medicine_transactions", model: "medicineTransaction", type: "many" },
    },
    uniques: [["name"]],
  },
  medicineCategory: {
    table: "medicine_categories",
    relations: {
      medicines: { fk: "categoryId", table: "medicines", model: "medicine", type: "many" },
    },
    uniques: [["name"]],
  },
  inventory: {
    table: "inventory",
    relations: {
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
      medicine: { fk: "medicineId", table: "medicines", model: "medicine", type: "one" },
    },
    uniques: [["campId", "medicineId"]],
  },
  medicineTransaction: {
    table: "medicine_transactions",
    relations: {
      medicine: { fk: "medicineId", table: "medicines", model: "medicine", type: "one" },
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
      user: { fk: "userId", table: "users", model: "user", type: "one" },
    },
  },
  doctorNote: {
    table: "doctor_notes",
    relations: {
      prescription: { fk: "prescriptionId", table: "prescriptions", model: "prescription", type: "one" },
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
      doctor: { fk: "doctorId", table: "users", model: "user", type: "one" },
    },
  },
  followUp: {
    table: "follow_ups",
    relations: {
      patient: { fk: "patientId", table: "patients", model: "patient", type: "one" },
    },
  },
  feedback: {
    table: "feedback",
    relations: {
      patient: { fk: "patientId", table: "patients", model: "patient", type: "one" },
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
    },
  },
  notification: {
    table: "notifications",
    relations: {
      user: { fk: "userId", table: "users", model: "user", type: "one" },
    },
  },
  auditLog: {
    table: "audit_logs",
    relations: {
      user: { fk: "userId", table: "users", model: "user", type: "one" },
    },
  },
  report: {
    table: "reports",
    relations: {
      camp: { fk: "campId", table: "camps", model: "camp", type: "one" },
      generatedBy: { fk: "generatedById", table: "users", model: "user", type: "one" },
    },
  },
};

// ── Column name mapping (camelCase ↔ snake_case) ───────────────────────

function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/** Convert a record's keys from camelCase to snake_case */
function keysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    let val = v;
    if (val instanceof Date) val = val.toISOString();
    if (typeof val === "boolean") val = val ? 1 : 0;
    out[toSnake(k)] = val;
  }
  return out;
}

/** Convert a record's keys from snake_case to camelCase */
function keysToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
  for (const [k, v] of Object.entries(obj)) {
    let val = v;
    if (typeof val === "string" && isoDateRegex.test(val)) {
      val = new Date(val);
    }
    out[toCamel(k)] = val;
  }
  return out;
}

// ── WHERE clause builder ───────────────────────────────────────────────

interface WhereResult {
  sql: string;
  params: unknown[];
}

function buildWhere(where: WhereCondition | undefined, tableAlias?: string): WhereResult {
  if (!where || Object.keys(where).length === 0) {
    return { sql: "", params: [] };
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  const prefix = tableAlias ? `${tableAlias}.` : "";

  // Handle OR conditions (used by patient search)
  if (where.OR && Array.isArray(where.OR)) {
    const orClauses: string[] = [];
    for (const cond of where.OR as WhereCondition[]) {
      const sub = buildWhere(cond, tableAlias);
      if (sub.sql) {
        orClauses.push(`(${sub.sql.replace(/^ WHERE /, "")})`);
        params.push(...sub.params);
      }
    }
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(" OR ")})`);
    }
  }

  // Handle AND conditions
  if (where.AND && Array.isArray(where.AND)) {
    for (const cond of where.AND as WhereCondition[]) {
      const sub = buildWhere(cond, tableAlias);
      if (sub.sql) {
        clauses.push(sub.sql.replace(/^ WHERE /, ""));
        params.push(...sub.params);
      }
    }
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === "OR" || key === "AND" || key === "NOT") continue;

    const col = `${prefix}"${toSnake(key)}"`;

    if (value === null || value === undefined) {
      clauses.push(`${col} IS NULL`);
    } else if (typeof value === "object" && !Array.isArray(value)) {
      const op = value as Record<string, unknown>;

      if ("contains" in op) {
        // Case-insensitive contains
        clauses.push(`LOWER(${col}) LIKE LOWER(?)`);
        params.push(`%${op.contains}%`);
      } else if ("in" in op && Array.isArray(op.in)) {
        const placeholders = op.in.map(() => "?").join(", ");
        clauses.push(`${col} IN (${placeholders})`);
        params.push(...op.in);
      } else if ("not" in op) {
        if (op.not === null) {
          clauses.push(`${col} IS NOT NULL`);
        } else {
          clauses.push(`${col} != ?`);
          params.push(op.not);
        }
      } else if ("gte" in op) {
        clauses.push(`${col} >= ?`);
        params.push(op.gte instanceof Date ? (op.gte as Date).toISOString() : op.gte);
      } else if ("lte" in op) {
        clauses.push(`${col} <= ?`);
        params.push(op.lte instanceof Date ? (op.lte as Date).toISOString() : op.lte);
      } else if ("gt" in op) {
        clauses.push(`${col} > ?`);
        params.push(op.gt);
      } else if ("lt" in op) {
        clauses.push(`${col} < ?`);
        params.push(op.lt);
      } else if ("increment" in op) {
        // This is used in UPDATE SET, not WHERE — skip
      } else if ("decrement" in op) {
        // Same — skip
      }
    } else {
      clauses.push(`${col} = ?`);
      let param = value instanceof Date ? value.toISOString() : value;
      if (typeof param === "boolean") param = param ? 1 : 0;
      params.push(param);
    }
  }

  if (clauses.length === 0) return { sql: "", params: [] };
  return { sql: ` WHERE ${clauses.join(" AND ")}`, params };
}

// ── ORDER BY builder ───────────────────────────────────────────────────

function buildOrderBy(orderBy: OrderBy | OrderBy[] | undefined): string {
  if (!orderBy) return "";

  const items = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];

  for (const item of items) {
    for (const [key, dir] of Object.entries(item)) {
      // Skip nested _count ordering (not supported in SQLite mode)
      if (key === "_count") continue;
      parts.push(`"${toSnake(key)}" ${dir.toUpperCase()}`);
    }
  }

  return parts.length > 0 ? ` ORDER BY ${parts.join(", ")}` : "";
}

// ── UPDATE SET builder (handles increment/decrement) ───────────────────

function buildUpdateSet(data: Record<string, unknown>): { setClauses: string[]; params: unknown[] } {
  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    const col = `"${toSnake(key)}"`;

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const op = value as Record<string, unknown>;
      if ("increment" in op) {
        setClauses.push(`${col} = ${col} + ?`);
        params.push(op.increment);
        continue;
      }
      if ("decrement" in op) {
        setClauses.push(`${col} = ${col} - ?`);
        params.push(op.decrement);
        continue;
      }
      if ("connect" in op || "disconnect" in op || "create" in op || "set" in op) {
        // Relation mutation — handled separately, skip here
        continue;
      }
    }

    setClauses.push(`${col} = ?`);
    let param = value instanceof Date ? value.toISOString() : value;
    if (typeof param === "boolean") param = param ? 1 : 0;
    params.push(param);
  }

  return { setClauses, params };
}

// ── SqliteModelRepo ────────────────────────────────────────────────────

class SqliteModelRepo implements IModelRepo {
  constructor(
    private sqliteDb: Database.Database,
    private modelName: string,
    private modelDef: ModelDef,
    private allModels: Record<string, ModelDef>,
  ) {}

  private get table(): string {
    return this.modelDef.table;
  }

  async create(args: { data: Record<string, unknown>; include?: IncludeRelation }): Promise<any> {
    const data = { ...args.data };

    // Generate ID if not provided
    if (!data.id) {
      data.id = uuidv4();
    }

    // Handle timestamps
    if (!data.createdAt) data.createdAt = new Date().toISOString();
    if (!data.updatedAt) data.updatedAt = new Date().toISOString();

    // Extract nested creates (e.g. medicines: { create: [...] })
    const nestedCreates: Array<{ relation: string; items: Record<string, unknown>[] }> = [];
    const connectOps: Array<{ relation: string; id: string }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const op = value as Record<string, unknown>;
        if ("create" in op) {
          const items = Array.isArray(op.create) ? op.create : [op.create];
          nestedCreates.push({ relation: key, items: items as Record<string, unknown>[] });
          delete data[key];
        } else if ("connect" in op) {
          const conn = op.connect as Record<string, unknown>;
          if (conn.id) {
            const rel = this.modelDef.relations[key];
            if (rel && rel.type === "one") {
              data[rel.fk] = conn.id;
            }
          }
          delete data[key];
        }
      }
    }

    // Convert dates to ISO strings
    for (const [k, v] of Object.entries(data)) {
      if (v instanceof Date) data[k] = v.toISOString();
      if (typeof v === "boolean") data[k] = v ? 1 : 0;
    }

    // Build INSERT
    const snakeData = keysToSnake(data);
    // Add sync metadata
    snakeData["_version"] = 1;
    snakeData["_synced"] = 0;
    snakeData["_deleted"] = 0;

    const cols = Object.keys(snakeData);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO "${this.table}" (${cols.map(c => `"${c}"`).join(", ")}) VALUES (${placeholders})`;

    this.sqliteDb.prepare(sql).run(...Object.values(snakeData));

    // Process nested creates
    for (const nested of nestedCreates) {
      const rel = this.modelDef.relations[nested.relation];
      if (!rel) continue;
      const childModel = this.allModels[rel.model];
      if (!childModel) continue;

      for (const item of nested.items) {
        const childData: Record<string, unknown> = {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...item,
          id: uuidv4(),
          [toCamel(rel.fk)]: data.id,
        };
        const childSnake = keysToSnake(childData);
        childSnake["_version"] = 1;
        childSnake["_synced"] = 0;
        childSnake["_deleted"] = 0;

        const childCols = Object.keys(childSnake);
        const childPh = childCols.map(() => "?").join(", ");
        this.sqliteDb.prepare(
          `INSERT INTO "${childModel.table}" (${childCols.map(c => `"${c}"`).join(", ")}) VALUES (${childPh})`
        ).run(...Object.values(childSnake));
      }
    }

    // Fetch and return the created record with includes
    return this.findUnique({ where: { id: data.id }, include: args.include });
  }

  async findUnique(args: FindUniqueOptions): Promise<any | null> {
    const { sql: whereSql, params } = buildWhere(args.where);
    const row = this.sqliteDb.prepare(
      `SELECT * FROM "${this.table}"${whereSql} AND "_deleted" = 0 LIMIT 1`
        .replace(/ AND "_deleted"/, whereSql ? ' AND "_deleted"' : ' WHERE "_deleted"')
    ).get(...params) as Record<string, unknown> | undefined;

    if (!row) return null;

    const result = keysToCamel(row);
    if (args.include) {
      await this.resolveIncludes(result, args.include);
    }
    return result;
  }

  async findFirst(args?: FindManyOptions): Promise<any | null> {
    const results = await this.findMany({ ...args, take: 1 });
    return results[0] ?? null;
  }

  async findMany(args?: FindManyOptions): Promise<any[]> {
    const { sql: whereSql, params } = buildWhere(args?.where);
    const orderSql = buildOrderBy(args?.orderBy as any);

    let fullWhere = whereSql;
    if (fullWhere) {
      fullWhere += ' AND "_deleted" = 0';
    } else {
      fullWhere = ' WHERE "_deleted" = 0';
    }

    let sql = `SELECT * FROM "${this.table}"${fullWhere}${orderSql}`;

    if (args?.take !== undefined) {
      sql += ` LIMIT ${args.take}`;
    }
    if (args?.skip !== undefined) {
      sql += ` OFFSET ${args.skip}`;
    }

    const rows = this.sqliteDb.prepare(sql).all(...params) as Record<string, unknown>[];
    const results = rows.map(keysToCamel);

    if (args?.include) {
      for (const result of results) {
        await this.resolveIncludes(result, args.include);
      }
    }

    return results;
  }

  async update(args: {
    where: WhereCondition;
    data: Record<string, unknown>;
    include?: IncludeRelation;
  }): Promise<any> {
    const data = { ...args.data };
    data.updatedAt = new Date().toISOString();

    // Handle nested relation operations in data
    const nestedCreates: Array<{ relation: string; items: Record<string, unknown>[] }> = [];

    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const op = value as Record<string, unknown>;
        if ("create" in op) {
          const items = Array.isArray(op.create) ? op.create : [op.create];
          nestedCreates.push({ relation: key, items: items as Record<string, unknown>[] });
          delete data[key];
        } else if ("connect" in op) {
          const conn = op.connect as Record<string, unknown>;
          if (conn.id) {
            const rel = this.modelDef.relations[key];
            if (rel && rel.type === "one") {
              data[rel.fk] = conn.id;
            }
          }
          delete data[key];
        } else if ("disconnect" in op) {
          const rel = this.modelDef.relations[key];
          if (rel && rel.type === "one") {
            data[rel.fk] = null;
          }
          delete data[key];
        }
      }
    }

    const { setClauses, params: setParams } = buildUpdateSet(data);

    // Bump version for sync
    setClauses.push('"_version" = "_version" + 1');
    setClauses.push('"_synced" = 0');

    const { sql: whereSql, params: whereParams } = buildWhere(args.where);

    if (setClauses.length > 0) {
      const sql = `UPDATE "${this.table}" SET ${setClauses.join(", ")}${whereSql}`;
      this.sqliteDb.prepare(sql).run(...setParams, ...whereParams);
    }

    // Process nested creates
    for (const nested of nestedCreates) {
      const rel = this.modelDef.relations[nested.relation];
      if (!rel) continue;
      const childModel = this.allModels[rel.model];
      if (!childModel) continue;

      // Find the parent id
      const parentRow = this.sqliteDb.prepare(
        `SELECT id FROM "${this.table}"${whereSql} LIMIT 1`
      ).get(...whereParams) as { id: string } | undefined;

      if (parentRow) {
        for (const item of nested.items) {
          const childData: Record<string, unknown> = {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...item,
            id: uuidv4(),
            [toCamel(rel.fk)]: parentRow.id,
          };
          const childSnake = keysToSnake(childData);
          childSnake["_version"] = 1;
          childSnake["_synced"] = 0;
          childSnake["_deleted"] = 0;

          const childCols = Object.keys(childSnake);
          const childPh = childCols.map(() => "?").join(", ");
          this.sqliteDb.prepare(
            `INSERT INTO "${childModel.table}" (${childCols.map(c => `"${c}"`).join(", ")}) VALUES (${childPh})`
          ).run(...Object.values(childSnake));
        }
      }
    }

    return this.findUnique({ where: args.where, include: args.include });
  }

  async updateMany(args: { where: WhereCondition; data: Record<string, unknown> }): Promise<{ count: number }> {
    const data = { ...args.data, updatedAt: new Date().toISOString() };
    const { setClauses, params: setParams } = buildUpdateSet(data);
    setClauses.push('"_version" = "_version" + 1');
    setClauses.push('"_synced" = 0');

    const { sql: whereSql, params: whereParams } = buildWhere(args.where);
    const sql = `UPDATE "${this.table}" SET ${setClauses.join(", ")}${whereSql}`;
    const result = this.sqliteDb.prepare(sql).run(...setParams, ...whereParams);
    return { count: result.changes };
  }

  async upsert(args: {
    where: WhereCondition;
    update: Record<string, unknown>;
    create: Record<string, unknown>;
  }): Promise<any> {
    const existing = await this.findUnique({ where: args.where });
    if (existing) {
      return this.update({ where: args.where, data: args.update });
    }
    return this.create({ data: args.create });
  }

  async delete(args: { where: WhereCondition }): Promise<any> {
    const existing = await this.findUnique({ where: args.where });
    // Soft delete for sync
    const { sql: whereSql, params } = buildWhere(args.where);
    this.sqliteDb.prepare(
      `UPDATE "${this.table}" SET "_deleted" = 1, "_synced" = 0, "_version" = "_version" + 1${whereSql}`
    ).run(...params);
    return existing;
  }

  async deleteMany(args: { where: WhereCondition }): Promise<{ count: number }> {
    const { sql: whereSql, params } = buildWhere(args.where);
    const result = this.sqliteDb.prepare(
      `UPDATE "${this.table}" SET "_deleted" = 1, "_synced" = 0, "_version" = "_version" + 1${whereSql}`
    ).run(...params);
    return { count: result.changes };
  }

  async count(args?: { where?: WhereCondition }): Promise<number> {
    const { sql: whereSql, params } = buildWhere(args?.where);
    let fullWhere = whereSql;
    if (fullWhere) {
      fullWhere += ' AND "_deleted" = 0';
    } else {
      fullWhere = ' WHERE "_deleted" = 0';
    }
    const row = this.sqliteDb.prepare(
      `SELECT COUNT(*) as count FROM "${this.table}"${fullWhere}`
    ).get(...params) as { count: number };
    return row.count;
  }

  async groupBy(args: GroupByOptions): Promise<any[]> {
    const groupCols = args.by.map((b) => `"${toSnake(b)}"`).join(", ");
    const selectParts = [groupCols];

    // Add _count aggregations
    if (args._count) {
      for (const [field, enabled] of Object.entries(args._count)) {
        if (enabled) {
          selectParts.push(`COUNT("${toSnake(field)}") as "_count_${toSnake(field)}"`);
        }
      }
    }

    const { sql: whereSql, params } = buildWhere(args.where);
    let fullWhere = whereSql;
    if (fullWhere) {
      fullWhere += ' AND "_deleted" = 0';
    } else {
      fullWhere = ' WHERE "_deleted" = 0';
    }

    let sql = `SELECT ${selectParts.join(", ")} FROM "${this.table}"${fullWhere} GROUP BY ${groupCols}`;

    // Order by
    if (args.orderBy) {
      const orderParts: string[] = [];
      for (const [key, dir] of Object.entries(args.orderBy)) {
        if (key === "_count" && typeof dir === "object") {
          for (const [field, direction] of Object.entries(dir)) {
            orderParts.push(`"_count_${toSnake(field)}" ${(direction as string).toUpperCase()}`);
          }
        }
      }
      if (orderParts.length) sql += ` ORDER BY ${orderParts.join(", ")}`;
    }

    if (args.take) sql += ` LIMIT ${args.take}`;

    const rows = this.sqliteDb.prepare(sql).all(...params) as Record<string, unknown>[];

    // Reshape to match Prisma's groupBy output format
    return rows.map((row) => {
      const result: Record<string, unknown> = {};
      for (const col of args.by) {
        result[col] = row[toSnake(col)];
      }
      if (args._count) {
        const countObj: Record<string, number> = {};
        for (const field of Object.keys(args._count)) {
          countObj[field] = (row[`_count_${toSnake(field)}`] as number) ?? 0;
        }
        result._count = countObj;
      }
      return result;
    });
  }

  // ── Relation resolver ──────────────────────────────────────────────────

  private async resolveIncludes(record: Record<string, unknown>, include: IncludeRelation): Promise<void> {
    for (const [relName, relOpts] of Object.entries(include)) {
      if (!relOpts) continue;

      // Handle _count includes (used by camp.findMany)
      if (relName === "_count") {
        const countSpec = relOpts as { select: Record<string, boolean> };
        const countResult: Record<string, number> = {};
        if (countSpec.select) {
          for (const [relKey, enabled] of Object.entries(countSpec.select)) {
            if (!enabled) continue;
            const rel = this.modelDef.relations[relKey];
            if (!rel) continue;
            const row = this.sqliteDb.prepare(
              `SELECT COUNT(*) as c FROM "${rel.table}" WHERE "${toSnake(rel.fk)}" = ? AND "_deleted" = 0`
            ).get(record.id) as { c: number };
            countResult[relKey] = row?.c ?? 0;
          }
        }
        record._count = countResult;
        continue;
      }

      const rel = this.modelDef.relations[relName];
      if (!rel) continue;

      const childModel = this.allModels[rel.model];
      if (!childModel) continue;

      const opts = typeof relOpts === "object" ? relOpts : {};
      const childInclude = (opts as any).include;
      const childOrderBy = (opts as any).orderBy;
      const childTake = (opts as any).take;
      const childWhere = (opts as any).where;
      const childSelect = (opts as any).select;

      if (rel.type === "one") {
        const fkValue = record[toCamel(rel.fk)];
        if (fkValue == null) {
          record[relName] = null;
          continue;
        }
        // For belongsTo, look up the parent record
        const parentRow = this.sqliteDb.prepare(
          `SELECT * FROM "${rel.table}" WHERE "id" = ? AND "_deleted" = 0 LIMIT 1`
        ).get(fkValue) as Record<string, unknown> | undefined;

        if (parentRow) {
          const parentResult = keysToCamel(parentRow);
          if (childInclude) {
            const childRepo = new SqliteModelRepo(this.sqliteDb, rel.model, childModel, this.allModels);
            await childRepo.resolveIncludes(parentResult, childInclude);
          }
          record[relName] = childSelect ? this.applySelect(parentResult, childSelect) : parentResult;
        } else {
          record[relName] = null;
        }
      } else {
        // hasMany
        let fkCol = toSnake(rel.fk);
        let childQuery: string;
        let queryParams: unknown[];

        // Handle many-to-many (diseases, allergies via join table)
        if (rel.table.startsWith("_")) {
          // Join table pattern: _patient_diseases(A = patient.id, B = disease.id)
          const targetTable = childModel.table;
          childQuery = `SELECT t.* FROM "${targetTable}" t
            INNER JOIN "${rel.table}" jt ON jt."B" = t."id"
            WHERE jt."A" = ? AND t."_deleted" = 0`;
          queryParams = [record.id];
        } else {
          childQuery = `SELECT * FROM "${rel.table}" WHERE "${fkCol}" = ? AND "_deleted" = 0`;
          queryParams = [record.id];

          if (childWhere) {
            const { sql: cwSql, params: cwParams } = buildWhere(childWhere);
            if (cwSql) {
              childQuery += cwSql.replace(" WHERE ", " AND ");
              queryParams.push(...cwParams);
            }
          }

          childQuery += buildOrderBy(childOrderBy);
          if (childTake) childQuery += ` LIMIT ${childTake}`;
        }

        const childRows = this.sqliteDb.prepare(childQuery).all(...queryParams) as Record<string, unknown>[];
        const childResults = childRows.map(keysToCamel);

        if (childInclude) {
          const childRepo = new SqliteModelRepo(this.sqliteDb, rel.model, childModel, this.allModels);
          for (const childResult of childResults) {
            await childRepo.resolveIncludes(childResult, childInclude);
          }
        }

        record[relName] = childSelect
          ? childResults.map(r => this.applySelect(r, childSelect))
          : childResults;
      }
    }
  }

  private applySelect(record: Record<string, unknown>, select: Record<string, boolean>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled && key in record) {
        result[key] = record[key];
      }
    }
    return result;
  }
}

// ── SqliteAdapter (main export) ────────────────────────────────────────

export class SqliteAdapter implements IDbAdapter {
  public readonly mode = "sqlite" as const;
  private sqliteDb: Database.Database;

  public user: IModelRepo;
  public role: IModelRepo;
  public permission: IModelRepo;
  public camp: IModelRepo;
  public patient: IModelRepo;
  public family: IModelRepo;
  public healthCard: IModelRepo;
  public vitals: IModelRepo;
  public disease: IModelRepo;
  public allergy: IModelRepo;
  public prescription: IModelRepo;
  public prescriptionMedicine: IModelRepo;
  public medicine: IModelRepo;
  public medicineCategory: IModelRepo;
  public inventory: IModelRepo;
  public medicineTransaction: IModelRepo;
  public doctorNote: IModelRepo;
  public followUp: IModelRepo;
  public feedback: IModelRepo;
  public notification: IModelRepo;
  public auditLog: IModelRepo;
  public report: IModelRepo;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(process.cwd(), "camp_data.db");
    logger.info(`[SqliteAdapter] Opening database at ${resolvedPath}`);

    this.sqliteDb = new Database(resolvedPath);

    // Enable WAL mode for concurrent reads
    this.sqliteDb.pragma("journal_mode = WAL");
    this.sqliteDb.pragma("foreign_keys = ON");

    // Create all model repos
    this.user = new SqliteModelRepo(this.sqliteDb, "user", MODELS.user, MODELS);
    this.role = new SqliteModelRepo(this.sqliteDb, "role", MODELS.role, MODELS);
    this.permission = new SqliteModelRepo(this.sqliteDb, "permission", MODELS.permission, MODELS);
    this.camp = new SqliteModelRepo(this.sqliteDb, "camp", MODELS.camp, MODELS);
    this.patient = new SqliteModelRepo(this.sqliteDb, "patient", MODELS.patient, MODELS);
    this.family = new SqliteModelRepo(this.sqliteDb, "family", MODELS.family, MODELS);
    this.healthCard = new SqliteModelRepo(this.sqliteDb, "healthCard", MODELS.healthCard, MODELS);
    this.vitals = new SqliteModelRepo(this.sqliteDb, "vitals", MODELS.vitals, MODELS);
    this.disease = new SqliteModelRepo(this.sqliteDb, "disease", MODELS.disease, MODELS);
    this.allergy = new SqliteModelRepo(this.sqliteDb, "allergy", MODELS.allergy, MODELS);
    this.prescription = new SqliteModelRepo(this.sqliteDb, "prescription", MODELS.prescription, MODELS);
    this.prescriptionMedicine = new SqliteModelRepo(this.sqliteDb, "prescriptionMedicine", MODELS.prescriptionMedicine, MODELS);
    this.medicine = new SqliteModelRepo(this.sqliteDb, "medicine", MODELS.medicine, MODELS);
    this.medicineCategory = new SqliteModelRepo(this.sqliteDb, "medicineCategory", MODELS.medicineCategory, MODELS);
    this.inventory = new SqliteModelRepo(this.sqliteDb, "inventory", MODELS.inventory, MODELS);
    this.medicineTransaction = new SqliteModelRepo(this.sqliteDb, "medicineTransaction", MODELS.medicineTransaction, MODELS);
    this.doctorNote = new SqliteModelRepo(this.sqliteDb, "doctorNote", MODELS.doctorNote, MODELS);
    this.followUp = new SqliteModelRepo(this.sqliteDb, "followUp", MODELS.followUp, MODELS);
    this.feedback = new SqliteModelRepo(this.sqliteDb, "feedback", MODELS.feedback, MODELS);
    this.notification = new SqliteModelRepo(this.sqliteDb, "notification", MODELS.notification, MODELS);
    this.auditLog = new SqliteModelRepo(this.sqliteDb, "auditLog", MODELS.auditLog, MODELS);
    this.report = new SqliteModelRepo(this.sqliteDb, "report", MODELS.report, MODELS);
  }

  async $queryRaw<T = any>(query: string, params?: unknown[]): Promise<T> {
    const stmt = this.sqliteDb.prepare(query);
    if (query.trim().toUpperCase().startsWith("SELECT")) {
      return stmt.all(...(params ?? [])) as T;
    }
    const result = stmt.run(...(params ?? []));
    return { changes: result.changes } as T;
  }

  async $connect(): Promise<void> {
    // SQLite is already connected on construction
    // We run the DDL and seed scripts on connect
    if (this.sqliteDb.name !== ":memory:") {
      bootstrapDb(this.sqliteDb);
    }
    logger.info("[SqliteAdapter] Database ready (WAL mode)");
  }

  async $disconnect(): Promise<void> {
    this.sqliteDb.close();
    logger.info("[SqliteAdapter] Database closed");
  }

  /** Expose the raw better-sqlite3 Database for DDL operations */
  getRawDb(): Database.Database {
    return this.sqliteDb;
  }
}

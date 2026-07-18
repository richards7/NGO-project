/**
 * IDbAdapter — Unified database interface.
 *
 * This is the abstraction that lets the same Express services run against
 * PostgreSQL (via Prisma) in cloud mode or SQLite (via better-sqlite3)
 * in local camp mode.
 *
 * Every method here maps 1:1 to a Prisma query pattern already used in
 * the existing service layer. No new capabilities — just portability.
 */

// ── Generic query types ────────────────────────────────────────────────

export interface WhereCondition {
  [key: string]: unknown;
}

export interface OrderBy {
  [key: string]: "asc" | "desc";
}

export interface IncludeRelation {
  [key: string]:
    | boolean
    | {
        include?: IncludeRelation;
        orderBy?: OrderBy;
        take?: number;
        select?: Record<string, boolean>;
        where?: WhereCondition;
      };
}

export interface FindManyOptions {
  where?: WhereCondition;
  orderBy?: OrderBy | OrderBy[];
  include?: IncludeRelation;
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
}

export interface FindUniqueOptions {
  where: WhereCondition;
  include?: IncludeRelation;
}

export interface GroupByOptions {
  by: string[];
  _count?: Record<string, boolean>;
  orderBy?: Record<string, Record<string, "asc" | "desc">>;
  where?: WhereCondition;
  take?: number;
}

export interface UpsertOptions {
  where: WhereCondition;
  update: Record<string, unknown>;
  create: Record<string, unknown>;
}

// ── Model repository interface ─────────────────────────────────────────

/**
 * Generic model repository — every table/model exposes these operations.
 * This mirrors the Prisma delegate pattern.
 */
export interface IModelRepo<T = any> {
  create(args: { data: Record<string, unknown>; include?: IncludeRelation }): Promise<T>;
  findUnique(args: FindUniqueOptions): Promise<T | null>;
  findFirst(args?: FindManyOptions): Promise<T | null>;
  findMany(args?: FindManyOptions): Promise<T[]>;
  update(args: {
    where: WhereCondition;
    data: Record<string, unknown>;
    include?: IncludeRelation;
  }): Promise<T>;
  updateMany(args: { where: WhereCondition; data: Record<string, unknown> }): Promise<{ count: number }>;
  upsert(args: UpsertOptions): Promise<T>;
  delete(args: { where: WhereCondition }): Promise<T>;
  deleteMany(args: { where: WhereCondition }): Promise<{ count: number }>;
  count(args?: { where?: WhereCondition }): Promise<number>;
  groupBy(args: GroupByOptions): Promise<any[]>;
}

// ── Main adapter interface ─────────────────────────────────────────────

/**
 * IDbAdapter — one property per Prisma model used in services.
 *
 * Naming matches Prisma's camelCase convention:
 *   prisma.patient  → db.patient
 *   prisma.vitals   → db.vitals
 *   etc.
 */
export interface IDbAdapter {
  // Core models
  user: IModelRepo;
  role: IModelRepo;
  permission: IModelRepo;
  camp: IModelRepo;
  patient: IModelRepo;
  family: IModelRepo;
  healthCard: IModelRepo;
  vitals: IModelRepo;
  disease: IModelRepo;
  allergy: IModelRepo;
  prescription: IModelRepo;
  prescriptionMedicine: IModelRepo;
  medicine: IModelRepo;
  medicineCategory: IModelRepo;
  inventory: IModelRepo;
  medicineTransaction: IModelRepo;
  doctorNote: IModelRepo;
  followUp: IModelRepo;
  feedback: IModelRepo;
  notification: IModelRepo;
  auditLog: IModelRepo;
  report: IModelRepo;

  /**
   * Execute a raw SQL query (used by sync service).
   * Returns rows for SELECT, or { changes: number } for mutations.
   */
  $queryRaw?<T = any>(query: string, params?: unknown[]): Promise<T>;

  /** Connect to the database (no-op for SQLite, connects for Prisma) */
  $connect(): Promise<void>;

  /** Disconnect from the database */
  $disconnect(): Promise<void>;

  /** The current mode */
  readonly mode: "postgres" | "sqlite";
}

import {
  LoomTelemetry,
  ThreadLot,
  WarpBeam,
  PatternCycle,
  DowntimeEvent,
  ShiftReportRecord,
  WeavingProcessDatabaseState,
  FullLineageTrace,
  YarnLotRecord,
  WarpBeamRecord,
  SizedBeamRecord,
  WeftPackageRecord,
  LoomJobRecord,
  FabricRollRecord,
  InspectionRecord,
  MendingRecord,
  PackedLotRecord,
} from "../types";

export interface SqlQueryResult {
  success: boolean;
  columns?: string[];
  rows?: Record<string, any>[];
  rowCount?: number;
  changes?: number;
  message?: string;
  executionTimeMs?: number;
  error?: string;
}

export interface TableSummary {
  tableName: string;
  rowCount: number;
  columns: {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
  }[];
}

/**
 * Execute arbitrary SQL query on the server's real SQLite database
 */
export async function executeSql(sql: string, params: any[] = []): Promise<SqlQueryResult> {
  try {
    const res = await fetch("/api/db/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, params }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Network request to database failed",
    };
  }
}

/**
 * Fetch all database table schemas and row counts
 */
export async function fetchTableSummaries(): Promise<TableSummary[]> {
  try {
    const res = await fetch("/api/db/tables");
    const data = await res.json();
    return data.tables || [];
  } catch {
    return [];
  }
}

/**
 * Fetch looms from SQLite
 */
export async function fetchLoomsFromDb(): Promise<LoomTelemetry[]> {
  try {
    const res = await fetch("/api/db/looms");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Update loom in SQLite
 */
export async function updateLoomInDb(id: string, updates: Partial<LoomTelemetry>): Promise<boolean> {
  try {
    const res = await fetch(`/api/db/looms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Fetch thread lots from SQLite
 */
export async function fetchThreadsFromDb(): Promise<ThreadLot[]> {
  try {
    const res = await fetch("/api/db/threads");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Update thread lot in SQLite
 */
export async function updateThreadInDb(id: string, updates: Partial<ThreadLot>): Promise<boolean> {
  try {
    const res = await fetch(`/api/db/threads/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Fetch warp beams from SQLite
 */
export async function fetchBeamsFromDb(): Promise<WarpBeam[]> {
  try {
    const res = await fetch("/api/db/beams");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Update warp beam in SQLite
 */
export async function updateBeamInDb(id: string, updates: Partial<WarpBeam>): Promise<boolean> {
  try {
    const res = await fetch(`/api/db/beams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Fetch pattern cycles from SQLite
 */
export async function fetchPatternsFromDb(): Promise<PatternCycle[]> {
  try {
    const res = await fetch("/api/db/patterns");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Fetch downtime logs from SQLite
 */
export async function fetchDowntimeFromDb(): Promise<DowntimeEvent[]> {
  try {
    const res = await fetch("/api/db/downtime");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Record downtime event into SQLite
 */
export async function recordDowntimeInDb(event: DowntimeEvent): Promise<boolean> {
  try {
    const res = await fetch("/api/db/downtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Acknowledge downtime in SQLite
 */
export async function ackDowntimeInDb(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/db/downtime/${id}/ack`, {
      method: "PUT",
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Fetch shift reports from SQLite
 */
export async function fetchShiftReportsFromDb(): Promise<ShiftReportRecord[]> {
  try {
    const res = await fetch("/api/db/shift-reports");
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

/**
 * Insert shift report into SQLite
 */
export async function insertShiftReportInDb(report: ShiftReportRecord): Promise<boolean> {
  try {
    const res = await fetch("/api/db/shift-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

/**
 * Reset database to initial factory defaults
 */
export async function resetDatabaseToFactory(): Promise<boolean> {
  try {
    const res = await fetch("/api/db/reset", { method: "POST" });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

// ==========================================
// 10-TABLE WEAVING PROCESS ER DIAGRAM CLIENT
// ==========================================

export async function fetchErdAll(): Promise<WeavingProcessDatabaseState | null> {
  try {
    const res = await fetch("/api/erd/all");
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function fetchErdTrace(search: string): Promise<FullLineageTrace | null> {
  try {
    const res = await fetch(`/api/erd/trace?search=${encodeURIComponent(search)}`);
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function insertYarnLotInDb(lot: Partial<YarnLotRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/yarn-lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lot),
    });
    const json = await res.json();
    return json.lot_id || null;
  } catch {
    return null;
  }
}

export async function insertWarpBeamInDb(beam: Partial<WarpBeamRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/warp-beams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(beam),
    });
    const json = await res.json();
    return json.beam_id || null;
  } catch {
    return null;
  }
}

export async function insertSizedBeamInDb(sized: Partial<SizedBeamRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/sized-beams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sized),
    });
    const json = await res.json();
    return json.sized_beam_id || null;
  } catch {
    return null;
  }
}

export async function insertWeftPackageInDb(pkg: Partial<WeftPackageRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/weft-packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pkg),
    });
    const json = await res.json();
    return json.package_id || null;
  } catch {
    return null;
  }
}

export async function insertLoomJobInDb(job: Partial<LoomJobRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/loom-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });
    const json = await res.json();
    return json.job_id || null;
  } catch {
    return null;
  }
}

export async function updateLoomJobStatusInDb(jobId: number, status: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/erd/loom-jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function insertFabricRollInDb(roll: Partial<FabricRollRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/fabric-rolls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roll),
    });
    const json = await res.json();
    return json.roll_id || null;
  } catch {
    return null;
  }
}

export async function updateFabricRollGradeInDb(rollId: number, grade: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/erd/fabric-rolls/${rollId}/grade`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grade }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function insertInspectionInDb(insp: Partial<InspectionRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(insp),
    });
    const json = await res.json();
    return json.inspection_id || null;
  } catch {
    return null;
  }
}

export async function insertMendingInDb(mend: Partial<MendingRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/mendings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mend),
    });
    const json = await res.json();
    return json.mending_id || null;
  } catch {
    return null;
  }
}

export async function updateMendingStatusInDb(mendingId: number, status: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/erd/mendings/${mendingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function insertPackedLotInDb(pack: Partial<PackedLotRecord>): Promise<number | null> {
  try {
    const res = await fetch("/api/erd/packed-lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pack),
    });
    const json = await res.json();
    return json.pack_id || null;
  } catch {
    return null;
  }
}


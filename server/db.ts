import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";
import {
  INITIAL_LOOMS,
  INITIAL_THREAD_LOTS,
  INITIAL_WARP_BEAMS,
  INITIAL_PATTERN_CYCLES,
  INITIAL_DOWNTIME_LOGS,
  INITIAL_SHIFT_REPORTS,
  DEFAULT_ENVIRONMENTAL,
} from "../src/data/mockData";
import {
  LoomTelemetry,
  ThreadLot,
  WarpBeam,
  PatternCycle,
  DowntimeEvent,
  ShiftReportRecord,
  YarnLotRecord,
  WarpBeamRecord,
  SizedBeamRecord,
  WeftPackageRecord,
  LoomRecord,
  LoomJobRecord,
  FabricRollRecord,
  InspectionRecord,
  MendingRecord,
  PackedLotRecord,
  WeavingProcessDatabaseState,
  FullLineageTrace,
} from "../src/types";

let dbInstance: Database | null = null;
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "weavetec_enterprise.sqlite");

export async function getDatabase(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      initErdTablesAndSeedIfMissing(dbInstance);
      saveDatabase(dbInstance);
      console.log("[SQLite] Loaded existing database from", DB_FILE);
      return dbInstance;
    } catch (err) {
      console.warn("[SQLite] Corrupted database file, re-initializing:", err);
    }
  }

  // Create new database
  dbInstance = new SQL.Database();
  initSchemaAndSeed(dbInstance);
  initErdTablesAndSeed(dbInstance);
  saveDatabase(dbInstance);
  console.log("[SQLite] Initialized brand new database with schemas and seeds at", DB_FILE);
  return dbInstance;
}

export function saveDatabase(db: Database = dbInstance!) {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("[SQLite] Error saving database to disk:", err);
  }
}

function initSchemaAndSeed(db: Database) {
  // 1. LOOM_TELEMETRY table
  db.run(`
    CREATE TABLE IF NOT EXISTS LOOM_TELEMETRY (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      shed TEXT NOT NULL,
      model TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      rpm INTEGER NOT NULL,
      target_rpm INTEGER NOT NULL,
      oee REAL NOT NULL,
      efficiency REAL NOT NULL,
      current_pattern_id TEXT,
      current_pattern_name TEXT,
      warp_lot_id TEXT,
      weft_lot_id TEXT,
      total_picks_shift INTEGER NOT NULL,
      total_meters_shift REAL NOT NULL,
      picks_per_cm REAL NOT NULL,
      warp_stops_count INTEGER NOT NULL,
      weft_stops_count INTEGER NOT NULL,
      warp_tension INTEGER NOT NULL,
      weft_tension INTEGER NOT NULL,
      beam_meters_remaining REAL NOT NULL,
      beam_total_meters REAL NOT NULL,
      last_stop_reason TEXT,
      last_stop_timestamp TEXT,
      operator_name TEXT NOT NULL
    );
  `);

  // 2. THREAD_INVENTORY table
  db.run(`
    CREATE TABLE IF NOT EXISTS THREAD_INVENTORY (
      id TEXT PRIMARY KEY,
      lot_number TEXT UNIQUE NOT NULL,
      yarn_type TEXT NOT NULL,
      count_specification TEXT NOT NULL,
      color TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      supplier TEXT NOT NULL,
      material_category TEXT NOT NULL,
      current_stock_kg REAL NOT NULL,
      min_threshold_kg REAL NOT NULL,
      allocated_looms TEXT,
      rack_location TEXT NOT NULL,
      unit_price_per_kg REAL NOT NULL,
      batch_moisture_regain REAL NOT NULL,
      tested_tensile_strength REAL NOT NULL
    );
  `);

  // 3. WARP_BEAMS table
  db.run(`
    CREATE TABLE IF NOT EXISTS WARP_BEAMS (
      id TEXT PRIMARY KEY,
      beam_code TEXT UNIQUE NOT NULL,
      flange_diameter_mm INTEGER NOT NULL,
      total_ends INTEGER NOT NULL,
      total_length_meters REAL NOT NULL,
      remaining_length_meters REAL NOT NULL,
      sizing_agent TEXT NOT NULL,
      assigned_loom_id TEXT,
      pattern_id TEXT,
      status TEXT NOT NULL,
      estimated_runout_hours REAL NOT NULL
    );
  `);

  // 4. PATTERN_CYCLES table
  db.run(`
    CREATE TABLE IF NOT EXISTS PATTERN_CYCLES (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      hook_count INTEGER NOT NULL,
      warp_ends_total INTEGER NOT NULL,
      weft_picks_repeat INTEGER NOT NULL,
      target_fabric_width_cm REAL NOT NULL,
      weight_gsm REAL NOT NULL,
      current_order_quantity_meters REAL NOT NULL,
      completed_meters REAL NOT NULL,
      cycle_start_date TEXT NOT NULL,
      target_completion_date TEXT NOT NULL,
      inspection_grade_pass_rate REAL NOT NULL,
      weave_type TEXT NOT NULL,
      preview_color1 TEXT NOT NULL,
      preview_color2 TEXT NOT NULL,
      cad_file_ref TEXT NOT NULL,
      active_loom_ids TEXT NOT NULL
    );
  `);

  // 5. DOWNTIME_LOGS table
  db.run(`
    CREATE TABLE IF NOT EXISTS DOWNTIME_LOGS (
      id TEXT PRIMARY KEY,
      loom_id TEXT NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      resolved_by TEXT,
      status TEXT NOT NULL
    );
  `);

  // 6. SHIFT_REPORTS table
  db.run(`
    CREATE TABLE IF NOT EXISTS SHIFT_REPORTS (
      id TEXT PRIMARY KEY,
      shift_name TEXT NOT NULL,
      date TEXT NOT NULL,
      shift_manager TEXT NOT NULL,
      incoming_manager TEXT NOT NULL,
      total_picks_executed INTEGER NOT NULL,
      total_meters_produced REAL NOT NULL,
      average_oee REAL NOT NULL,
      warp_stops_total INTEGER NOT NULL,
      weft_stops_total INTEGER NOT NULL,
      top_loss_loom_id TEXT NOT NULL,
      ai_briefing_text TEXT NOT NULL,
      signoff_status TEXT NOT NULL,
      signed_at TEXT
    );
  `);

  // 7. PLANT_ENVIRONMENT table
  db.run(`
    CREATE TABLE IF NOT EXISTS PLANT_ENVIRONMENT (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      relative_humidity REAL NOT NULL,
      temperature_c REAL NOT NULL,
      compressed_air_bar REAL NOT NULL
    );
  `);

  // Seed INITIAL_LOOMS
  const loomStmt = db.prepare(`
    INSERT OR REPLACE INTO LOOM_TELEMETRY VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const l of INITIAL_LOOMS) {
    loomStmt.run([
      l.id,
      l.name,
      l.shed,
      l.model,
      l.type,
      l.status,
      l.rpm,
      l.targetRpm,
      l.oee,
      l.efficiency,
      l.currentPatternId,
      l.currentPatternName,
      l.warpLotId,
      l.weftLotId,
      l.totalPicksShift,
      l.totalMetersShift,
      l.picksPerCm,
      l.warpStopsCount,
      l.weftStopsCount,
      l.warpTension,
      l.weftTension,
      l.beamMetersRemaining,
      l.beamTotalMeters,
      l.lastStopReason || null,
      l.lastStopTimestamp || null,
      l.operatorName,
    ]);
  }
  loomStmt.free();

  // Seed INITIAL_THREAD_LOTS
  const threadStmt = db.prepare(`
    INSERT OR REPLACE INTO THREAD_INVENTORY VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const t of INITIAL_THREAD_LOTS) {
    threadStmt.run([
      t.id,
      t.lotNumber,
      t.yarnType,
      t.countSpecification,
      t.color,
      t.colorHex,
      t.supplier,
      t.materialCategory,
      t.currentStockKg,
      t.minThresholdKg,
      JSON.stringify(t.allocatedLooms),
      t.rackLocation,
      t.unitPricePerKg,
      t.batchMoistureRegain,
      t.testedTensileStrength,
    ]);
  }
  threadStmt.free();

  // Seed INITIAL_WARP_BEAMS
  const beamStmt = db.prepare(`
    INSERT OR REPLACE INTO WARP_BEAMS VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const b of INITIAL_WARP_BEAMS) {
    beamStmt.run([
      b.id,
      b.beamCode,
      b.flangeDiameterMm,
      b.totalEnds,
      b.totalLengthMeters,
      b.remainingLengthMeters,
      b.sizingAgent,
      b.assignedLoomId,
      b.patternId,
      b.status,
      b.estimatedRunoutHours,
    ]);
  }
  beamStmt.free();

  // Seed INITIAL_PATTERN_CYCLES
  const patternStmt = db.prepare(`
    INSERT OR REPLACE INTO PATTERN_CYCLES VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const p of INITIAL_PATTERN_CYCLES) {
    patternStmt.run([
      p.id,
      p.code,
      p.name,
      p.category,
      p.hookCount,
      p.warpEndsTotal,
      p.weftPicksRepeat,
      p.targetFabricWidthCm,
      p.weightGsm,
      p.currentOrderQuantityMeters,
      p.completedMeters,
      p.cycleStartDate,
      p.targetCompletionDate,
      p.inspectionGradePassRate,
      p.weaveType,
      p.previewColor1,
      p.previewColor2,
      p.cadFileRef,
      JSON.stringify(p.activeLoomIds),
    ]);
  }
  patternStmt.free();

  // Seed INITIAL_DOWNTIME_LOGS
  const dwnStmt = db.prepare(`
    INSERT OR REPLACE INTO DOWNTIME_LOGS VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const d of INITIAL_DOWNTIME_LOGS) {
    dwnStmt.run([
      d.id,
      d.loomId,
      d.type,
      d.reason,
      d.durationMinutes,
      d.timestamp,
      d.resolvedBy || null,
      d.status,
    ]);
  }
  dwnStmt.free();

  // Seed INITIAL_SHIFT_REPORTS
  const repStmt = db.prepare(`
    INSERT OR REPLACE INTO SHIFT_REPORTS VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);
  for (const r of INITIAL_SHIFT_REPORTS) {
    repStmt.run([
      r.id,
      r.shiftName,
      r.date,
      r.shiftManager,
      r.incomingManager,
      r.totalPicksExecuted,
      r.totalMetersProduced,
      r.averageOee,
      r.warpStopsTotal,
      r.weftStopsTotal,
      r.topLossLoomId,
      r.aiBriefingText,
      r.signoffStatus,
      r.signedAt || null,
    ]);
  }
  repStmt.free();

  // Seed Environmental
  const envStmt = db.prepare(`
    INSERT INTO PLANT_ENVIRONMENT (timestamp, relative_humidity, temperature_c, compressed_air_bar)
    VALUES (?, ?, ?, ?)
  `);
  envStmt.run([
    new Date().toISOString(),
    DEFAULT_ENVIRONMENTAL.relativeHumidity,
    DEFAULT_ENVIRONMENTAL.temperatureC,
    DEFAULT_ENVIRONMENTAL.compressedAirBar,
  ]);
  envStmt.free();
}

/**
 * Execute raw arbitrary SQL statement (SELECT, INSERT, UPDATE, DELETE, DDL)
 */
export async function executeSqlQuery(sql: string, params: any[] = []) {
  const db = await getDatabase();
  const trimmed = sql.trim();
  const isSelect = /^SELECT|^PRAGMA|^EXPLAIN/i.test(trimmed);

  const startTime = performance.now();

  try {
    if (isSelect) {
      const results = db.exec(trimmed, params);
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
      if (!results || results.length === 0) {
        return {
          columns: [],
          rows: [],
          rowCount: 0,
          executionTimeMs,
        };
      }
      const columns = results[0].columns;
      const rows = results[0].values.map((valArray) => {
        const obj: Record<string, any> = {};
        columns.forEach((col, idx) => {
          obj[col] = valArray[idx];
        });
        return obj;
      });
      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs,
      };
    } else {
      db.run(trimmed, params);
      saveDatabase(db);
      const executionTimeMs = Number((performance.now() - startTime).toFixed(2));
      const changes = db.getRowsModified();
      return {
        success: true,
        changes,
        message: `Statement executed successfully. (${changes} rows affected)`,
        executionTimeMs,
      };
    }
  } catch (error: any) {
    throw new Error(error?.message || "SQL Execution Error");
  }
}

/**
 * Helper to fetch all looms formatted as LoomTelemetry
 */
export async function dbGetLooms(): Promise<LoomTelemetry[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM LOOM_TELEMETRY ORDER BY id ASC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    return {
      id: row.id,
      name: row.name,
      shed: row.shed,
      model: row.model,
      type: row.type,
      status: row.status,
      rpm: row.rpm,
      targetRpm: row.target_rpm,
      oee: row.oee,
      efficiency: row.efficiency,
      currentPatternId: row.current_pattern_id,
      currentPatternName: row.current_pattern_name,
      warpLotId: row.warp_lot_id,
      weftLotId: row.weft_lot_id,
      totalPicksShift: row.total_picks_shift,
      totalMetersShift: row.total_meters_shift,
      picksPerCm: row.picks_per_cm,
      warpStopsCount: row.warp_stops_count,
      weftStopsCount: row.weft_stops_count,
      warpTension: row.warp_tension,
      weftTension: row.weft_tension,
      beamMetersRemaining: row.beam_meters_remaining,
      beamTotalMeters: row.beam_total_meters,
      lastStopReason: row.last_stop_reason || undefined,
      lastStopTimestamp: row.last_stop_timestamp || undefined,
      operatorName: row.operator_name,
    };
  });
}

/**
 * Helper to update a loom
 */
export async function dbUpdateLoom(id: string, updates: Partial<LoomTelemetry>) {
  const db = await getDatabase();
  const assignments: string[] = [];
  const values: any[] = [];

  const mapping: Record<keyof LoomTelemetry | string, string> = {
    rpm: "rpm",
    targetRpm: "target_rpm",
    status: "status",
    oee: "oee",
    efficiency: "efficiency",
    totalPicksShift: "total_picks_shift",
    totalMetersShift: "total_meters_shift",
    warpStopsCount: "warp_stops_count",
    weftStopsCount: "weft_stops_count",
    warpTension: "warp_tension",
    weftTension: "weft_tension",
    beamMetersRemaining: "beam_meters_remaining",
    lastStopReason: "last_stop_reason",
    lastStopTimestamp: "last_stop_timestamp",
    operatorName: "operator_name",
  };

  for (const [key, val] of Object.entries(updates)) {
    const col = mapping[key];
    if (col !== undefined) {
      assignments.push(`${col} = ?`);
      values.push(val);
    }
  }

  if (assignments.length > 0) {
    values.push(id);
    db.run(`UPDATE LOOM_TELEMETRY SET ${assignments.join(", ")} WHERE id = ?`, values);
    saveDatabase(db);
  }
}

/**
 * Helper to get thread lots
 */
export async function dbGetThreadLots(): Promise<ThreadLot[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM THREAD_INVENTORY ORDER BY lot_number ASC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    let allocated: string[] = [];
    try {
      allocated = JSON.parse(row.allocated_looms || "[]");
    } catch {}
    return {
      id: row.id,
      lotNumber: row.lot_number,
      yarnType: row.yarn_type,
      countSpecification: row.count_specification,
      color: row.color,
      colorHex: row.color_hex,
      supplier: row.supplier,
      materialCategory: row.material_category,
      currentStockKg: row.current_stock_kg,
      minThresholdKg: row.min_threshold_kg,
      allocatedLooms: allocated,
      rackLocation: row.rack_location,
      unitPricePerKg: row.unit_price_per_kg,
      batchMoistureRegain: row.batch_moisture_regain,
      testedTensileStrength: row.tested_tensile_strength,
    };
  });
}

/**
 * Helper to update a thread lot
 */
export async function dbUpdateThreadLot(id: string, updates: Partial<ThreadLot>) {
  const db = await getDatabase();
  const assignments: string[] = [];
  const values: any[] = [];

  if (updates.currentStockKg !== undefined) {
    assignments.push("current_stock_kg = ?");
    values.push(updates.currentStockKg);
  }
  if (updates.rackLocation !== undefined) {
    assignments.push("rack_location = ?");
    values.push(updates.rackLocation);
  }
  if (updates.minThresholdKg !== undefined) {
    assignments.push("min_threshold_kg = ?");
    values.push(updates.minThresholdKg);
  }

  if (assignments.length > 0) {
    values.push(id);
    db.run(`UPDATE THREAD_INVENTORY SET ${assignments.join(", ")} WHERE id = ?`, values);
    saveDatabase(db);
  }
}

/**
 * Helper to get warp beams
 */
export async function dbGetWarpBeams(): Promise<WarpBeam[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM WARP_BEAMS ORDER BY beam_code ASC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    return {
      id: row.id,
      beamCode: row.beam_code,
      flangeDiameterMm: row.flange_diameter_mm,
      totalEnds: row.total_ends,
      totalLengthMeters: row.total_length_meters,
      remainingLengthMeters: row.remaining_length_meters,
      sizingAgent: row.sizing_agent,
      assignedLoomId: row.assigned_loom_id,
      patternId: row.pattern_id,
      status: row.status,
      estimatedRunoutHours: row.estimated_runout_hours,
    };
  });
}

/**
 * Helper to update warp beam
 */
export async function dbUpdateWarpBeam(id: string, updates: Partial<WarpBeam>) {
  const db = await getDatabase();
  const assignments: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) {
    assignments.push("status = ?");
    values.push(updates.status);
  }
  if (updates.remainingLengthMeters !== undefined) {
    assignments.push("remaining_length_meters = ?");
    values.push(updates.remainingLengthMeters);
  }
  if (updates.assignedLoomId !== undefined) {
    assignments.push("assigned_loom_id = ?");
    values.push(updates.assignedLoomId);
  }

  if (assignments.length > 0) {
    values.push(id);
    db.run(`UPDATE WARP_BEAMS SET ${assignments.join(", ")} WHERE id = ?`, values);
    saveDatabase(db);
  }
}

/**
 * Helper to get pattern cycles
 */
export async function dbGetPatterns(): Promise<PatternCycle[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM PATTERN_CYCLES ORDER BY code ASC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    let activeLooms: string[] = [];
    try {
      activeLooms = JSON.parse(row.active_loom_ids || "[]");
    } catch {}
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      category: row.category,
      hookCount: row.hook_count,
      warpEndsTotal: row.warp_ends_total,
      weftPicksRepeat: row.weft_picks_repeat,
      targetFabricWidthCm: row.target_fabric_width_cm,
      weightGsm: row.weight_gsm,
      currentOrderQuantityMeters: row.current_order_quantity_meters,
      completedMeters: row.completed_meters,
      cycleStartDate: row.cycle_start_date,
      targetCompletionDate: row.target_completion_date,
      inspectionGradePassRate: row.inspection_grade_pass_rate,
      weaveType: row.weave_type,
      previewColor1: row.preview_color1,
      previewColor2: row.preview_color2,
      cadFileRef: row.cad_file_ref,
      activeLoomIds: activeLooms,
    };
  });
}

/**
 * Helper to get downtime logs
 */
export async function dbGetDowntimeLogs(): Promise<DowntimeEvent[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM DOWNTIME_LOGS ORDER BY rowid DESC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    return {
      id: row.id,
      loomId: row.loom_id,
      type: row.type,
      reason: row.reason,
      durationMinutes: row.duration_minutes,
      timestamp: row.timestamp,
      resolvedBy: row.resolved_by || undefined,
      status: row.status,
    };
  });
}

/**
 * Add downtime event
 */
export async function dbInsertDowntimeLog(event: DowntimeEvent) {
  const db = await getDatabase();
  db.run(
    `INSERT INTO DOWNTIME_LOGS (id, loom_id, type, reason, duration_minutes, timestamp, resolved_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.id,
      event.loomId,
      event.type,
      event.reason,
      event.durationMinutes,
      event.timestamp,
      event.resolvedBy || null,
      event.status,
    ]
  );
  saveDatabase(db);
}

/**
 * Acknowledge downtime
 */
export async function dbAcknowledgeDowntime(id: string) {
  const db = await getDatabase();
  db.run("UPDATE DOWNTIME_LOGS SET status = 'ACKNOWLEDGED' WHERE id = ?", [id]);
  saveDatabase(db);
}

/**
 * Helper to get shift reports
 */
export async function dbGetShiftReports(): Promise<ShiftReportRecord[]> {
  const db = await getDatabase();
  const res = db.exec("SELECT * FROM SHIFT_REPORTS ORDER BY rowid DESC");
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((v) => {
    const row: any = {};
    cols.forEach((c, idx) => {
      row[c] = v[idx];
    });
    return {
      id: row.id,
      shiftName: row.shift_name,
      date: row.date,
      shiftManager: row.shift_manager,
      incomingManager: row.incoming_manager,
      totalPicksExecuted: row.total_picks_executed,
      totalMetersProduced: row.total_meters_produced,
      averageOee: row.average_oee,
      warpStopsTotal: row.warp_stops_total,
      weftStopsTotal: row.weft_stops_total,
      topLossLoomId: row.top_loss_loom_id,
      aiBriefingText: row.ai_briefing_text,
      signoffStatus: row.signoff_status,
      signedAt: row.signed_at || undefined,
    };
  });
}

/**
 * Add shift report
 */
export async function dbInsertShiftReport(r: ShiftReportRecord) {
  const db = await getDatabase();
  db.run(
    `INSERT INTO SHIFT_REPORTS (id, shift_name, date, shift_manager, incoming_manager, total_picks_executed,
      total_meters_produced, average_oee, warp_stops_total, weft_stops_total, top_loss_loom_id,
      ai_briefing_text, signoff_status, signed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id,
      r.shiftName,
      r.date,
      r.shiftManager,
      r.incomingManager,
      r.totalPicksExecuted,
      r.totalMetersProduced,
      r.averageOee,
      r.warpStopsTotal,
      r.weftStopsTotal,
      r.topLossLoomId,
      r.aiBriefingText,
      r.signoffStatus,
      r.signedAt || null,
    ]
  );
  saveDatabase(db);
}

/**
 * Get schema summary for APEX Object Browser
 */
export async function dbGetSchemaSummary() {
  const db = await getDatabase();
  const tables = [
    "YARN_LOT",
    "WARP_BEAM",
    "SIZED_BEAM",
    "WEFT_PACKAGE",
    "LOOM",
    "LOOM_JOB",
    "FABRIC_ROLL",
    "INSPECTION",
    "MENDING",
    "PACKED_LOT",
    "LOOM_TELEMETRY",
    "THREAD_INVENTORY",
    "WARP_BEAMS",
    "PATTERN_CYCLES",
    "DOWNTIME_LOGS",
    "SHIFT_REPORTS",
    "PLANT_ENVIRONMENT",
  ];

  const summary = tables.map((tbl) => {
    try {
      const countRes = db.exec(`SELECT COUNT(*) AS cnt FROM ${tbl}`);
      const rowCount = countRes[0]?.values[0][0] ?? 0;
      const infoRes = db.exec(`PRAGMA table_info(${tbl})`);
      const cols = infoRes[0]?.values.map((v) => ({
        cid: v[0],
        name: v[1],
        type: v[2],
        notnull: v[3],
        dflt_value: v[4],
        pk: v[5],
      })) || [];

      return {
        tableName: tbl,
        rowCount,
        columns: cols,
      };
    } catch {
      return {
        tableName: tbl,
        rowCount: 0,
        columns: [],
      };
    }
  });

  return summary;
}

/**
 * Reset database to initial factory defaults
 */
export async function dbResetFactory() {
  const db = await getDatabase();
  const tables = [
    "PACKED_LOT",
    "MENDING",
    "INSPECTION",
    "FABRIC_ROLL",
    "LOOM_JOB",
    "SIZED_BEAM",
    "WEFT_PACKAGE",
    "WARP_BEAM",
    "LOOM",
    "YARN_LOT",
    "LOOM_TELEMETRY",
    "THREAD_INVENTORY",
    "WARP_BEAMS",
    "PATTERN_CYCLES",
    "DOWNTIME_LOGS",
    "SHIFT_REPORTS",
    "PLANT_ENVIRONMENT",
  ];
  for (const t of tables) {
    db.run(`DROP TABLE IF EXISTS ${t}`);
  }
  initSchemaAndSeed(db);
  initErdTablesAndSeed(db);
  saveDatabase(db);
  return { success: true, message: "Database reset to factory defaults with all 10 ER tables." };
}

// =========================================================================
// WEAVING PROCESS ER DIAGRAM - 10 TABLES SCHEMA, SEED & QUERIES
// =========================================================================

export function initErdTablesAndSeedIfMissing(db: Database) {
  try {
    const res = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='YARN_LOT'");
    if (!res || res.length === 0 || res[0].values.length === 0) {
      console.log("[SQLite] ER tables missing in existing database. Bootstrapping ER schemas and seeds...");
      initErdTablesAndSeed(db);
    }
  } catch (err) {
    console.warn("[SQLite] Error checking ER tables:", err);
  }
}

export function initErdTablesAndSeed(db: Database) {
  // 1. YARN_LOT
  db.run(`
    CREATE TABLE IF NOT EXISTS YARN_LOT (
      lot_id INTEGER PRIMARY KEY,
      yarn_count TEXT NOT NULL,
      supplier TEXT NOT NULL,
      received_date TEXT NOT NULL
    );
  `);

  // 2. WARP_BEAM
  db.run(`
    CREATE TABLE IF NOT EXISTS WARP_BEAM (
      beam_id INTEGER PRIMARY KEY,
      lot_id INTEGER NOT NULL,
      total_ends INTEGER NOT NULL,
      beam_length REAL NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES YARN_LOT(lot_id)
    );
  `);

  // 3. SIZED_BEAM
  db.run(`
    CREATE TABLE IF NOT EXISTS SIZED_BEAM (
      sized_beam_id INTEGER PRIMARY KEY,
      beam_id INTEGER NOT NULL,
      size_recipe TEXT NOT NULL,
      sizing_date TEXT NOT NULL,
      FOREIGN KEY (beam_id) REFERENCES WARP_BEAM(beam_id)
    );
  `);

  // 4. WEFT_PACKAGE
  db.run(`
    CREATE TABLE IF NOT EXISTS WEFT_PACKAGE (
      package_id INTEGER PRIMARY KEY,
      lot_id INTEGER NOT NULL,
      count TEXT NOT NULL,
      FOREIGN KEY (lot_id) REFERENCES YARN_LOT(lot_id)
    );
  `);

  // 5. LOOM
  db.run(`
    CREATE TABLE IF NOT EXISTS LOOM (
      loom_id INTEGER PRIMARY KEY,
      loom_type TEXT NOT NULL,
      reed_width REAL NOT NULL
    );
  `);

  // 6. LOOM_JOB
  db.run(`
    CREATE TABLE IF NOT EXISTS LOOM_JOB (
      job_id INTEGER PRIMARY KEY,
      loom_id INTEGER NOT NULL,
      sized_beam_id INTEGER NOT NULL,
      package_id INTEGER NOT NULL,
      article_no TEXT NOT NULL,
      start_date TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (loom_id) REFERENCES LOOM(loom_id),
      FOREIGN KEY (sized_beam_id) REFERENCES SIZED_BEAM(sized_beam_id),
      FOREIGN KEY (package_id) REFERENCES WEFT_PACKAGE(package_id)
    );
  `);

  // 7. FABRIC_ROLL
  db.run(`
    CREATE TABLE IF NOT EXISTS FABRIC_ROLL (
      roll_id INTEGER PRIMARY KEY,
      job_id INTEGER NOT NULL,
      length_mtrs REAL NOT NULL,
      grade TEXT NOT NULL,
      FOREIGN KEY (job_id) REFERENCES LOOM_JOB(job_id)
    );
  `);

  // 8. INSPECTION
  db.run(`
    CREATE TABLE IF NOT EXISTS INSPECTION (
      inspection_id INTEGER PRIMARY KEY,
      roll_id INTEGER NOT NULL,
      defect_points REAL NOT NULL,
      inspector TEXT NOT NULL,
      FOREIGN KEY (roll_id) REFERENCES FABRIC_ROLL(roll_id)
    );
  `);

  // 9. MENDING
  db.run(`
    CREATE TABLE IF NOT EXISTS MENDING (
      mending_id INTEGER PRIMARY KEY,
      inspection_id INTEGER NOT NULL,
      defect_type TEXT NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (inspection_id) REFERENCES INSPECTION(inspection_id)
    );
  `);

  // 10. PACKED_LOT
  db.run(`
    CREATE TABLE IF NOT EXISTS PACKED_LOT (
      pack_id INTEGER PRIMARY KEY,
      roll_id INTEGER UNIQUE NOT NULL,
      customer_po TEXT NOT NULL,
      dispatch_date TEXT NOT NULL,
      FOREIGN KEY (roll_id) REFERENCES FABRIC_ROLL(roll_id)
    );
  `);

  // SEED INITIAL ER DATA IF EMPTY
  const countCheck = db.exec("SELECT COUNT(*) FROM YARN_LOT");
  if (countCheck && countCheck[0]?.values?.[0]?.[0] !== undefined && Number(countCheck[0].values[0][0]) > 0) {
    return; // Already populated
  }

  // 1. Seed YARN_LOT
  const yarnStmt = db.prepare(`INSERT OR REPLACE INTO YARN_LOT VALUES (?, ?, ?, ?)`);
  const initialYarnLots = [
    [101, "Ne 40/1 Combed Cotton Ring Spun", "Vardhman Textiles Ltd", "2026-09-02"],
    [102, "Ne 60/1 Giza Cotton Compact", "Maral Yarns Co", "2026-09-04"],
    [103, "150D/48F Polyester DTY", "Zhejiang Hengyi Petrochem", "2026-09-06"],
    [104, "Mulberry Silk 20/22D Grade 5A", "Shengzhou Silk Spinning", "2026-09-08"],
    [105, "Ne 20/2 Slub Linen / Cotton", "Banswara Syntex Ltd", "2026-09-10"],
    [106, "Ne 30/1 Organic Carded Cotton", "Nahar Spinning Mills", "2026-09-12"],
  ];
  for (const y of initialYarnLots) yarnStmt.run(y);
  yarnStmt.free();

  // 2. Seed WARP_BEAM
  const warpStmt = db.prepare(`INSERT OR REPLACE INTO WARP_BEAM VALUES (?, ?, ?, ?)`);
  const initialWarpBeams = [
    [201, 101, 6400, 4500.0],
    [202, 102, 9600, 3800.0],
    [203, 103, 5400, 5200.0],
    [204, 104, 11200, 2800.0],
    [205, 105, 4800, 4200.0],
  ];
  for (const w of initialWarpBeams) warpStmt.run(w);
  warpStmt.free();

  // 3. Seed SIZED_BEAM
  const sizedStmt = db.prepare(`INSERT OR REPLACE INTO SIZED_BEAM VALUES (?, ?, ?, ?)`);
  const initialSizedBeams = [
    [301, 201, "PVA 6% + Tapioca Starch 4% + Wax Emulsion 0.5%", "2026-09-08"],
    [302, 202, "Carboxymethyl Cellulose (CMC) 5% + Acrylic Copolymer 2%", "2026-09-10"],
    [303, 203, "Synthetic Polyester Binder 7% + Antistatic Lub 0.8%", "2026-09-12"],
    [304, 204, "Sericin Protective Finish + Vegetable Wax 1.2%", "2026-09-14"],
    [305, 205, "Modified Corn Starch 8% + Tallow Softener 1%", "2026-09-15"],
  ];
  for (const s of initialSizedBeams) sizedStmt.run(s);
  sizedStmt.free();

  // 4. Seed WEFT_PACKAGE
  const weftStmt = db.prepare(`INSERT OR REPLACE INTO WEFT_PACKAGE VALUES (?, ?, ?)`);
  const initialWeftPackages = [
    [401, 101, "Ne 40/1"],
    [402, 102, "Ne 60/1"],
    [403, 103, "150D/48F"],
    [404, 104, "Mulberry Silk 20/22D"],
    [405, 105, "Ne 20/2"],
    [406, 106, "Ne 30/1"],
  ];
  for (const wp of initialWeftPackages) weftStmt.run(wp);
  weftStmt.free();

  // 5. Seed LOOM
  const loomStmt = db.prepare(`INSERT OR REPLACE INTO LOOM VALUES (?, ?, ?)`);
  const initialLooms = [
    [1, "Air Jet (Picanol OmniPlus-i)", 190.0],
    [2, "Air Jet (Tsudakoma ZAX9200i)", 220.0],
    [3, "Rapier (Dornier P2)", 220.0],
    [4, "Electronic Jacquard (Staubli SX)", 280.0],
    [5, "Rapier High-Density (Itema R9500)", 190.0],
    [6, "Projectile Wide-Width (Sulzer G6300)", 340.0],
    [7, "Electronic Jacquard (Bonas Si)", 280.0],
    [8, "Air Jet Dobby (Toyota JAT810)", 190.0],
  ];
  for (const lm of initialLooms) loomStmt.run(lm);
  loomStmt.free();

  // 6. Seed LOOM_JOB
  const jobStmt = db.prepare(`INSERT OR REPLACE INTO LOOM_JOB VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const initialLoomJobs = [
    [501, 1, 301, 401, "ART-OXFORD-204", "2026-09-14", "RUNNING"],
    [502, 2, 302, 402, "ART-SATIN-804", "2026-09-15", "RUNNING"],
    [503, 3, 303, 403, "ART-TWILL-502", "2026-09-16", "RUNNING"],
    [504, 4, 304, 404, "ART-JACQUARD-901", "2026-09-16", "RUNNING"],
    [505, 5, 305, 405, "ART-LINEN-303", "2026-09-17", "SETUP"],
    [506, 6, 301, 406, "ART-SHEETING-102", "2026-09-10", "COMPLETED"],
  ];
  for (const j of initialLoomJobs) jobStmt.run(j);
  jobStmt.free();

  // 7. Seed FABRIC_ROLL
  const rollStmt = db.prepare(`INSERT OR REPLACE INTO FABRIC_ROLL VALUES (?, ?, ?, ?)`);
  const initialFabricRolls = [
    [601, 501, 120.0, "Grade A"],
    [602, 501, 115.5, "Grade A"],
    [603, 502, 100.0, "Grade B"],
    [604, 502, 125.0, "Grade A"],
    [605, 503, 110.0, "Grade A"],
    [606, 504, 95.0, "Grade B"],
    [607, 504, 88.0, "Pending Inspection"],
    [608, 506, 130.0, "Grade A"],
  ];
  for (const r of initialFabricRolls) rollStmt.run(r);
  rollStmt.free();

  // 8. Seed INSPECTION
  const inspStmt = db.prepare(`INSERT OR REPLACE INTO INSPECTION VALUES (?, ?, ?, ?)`);
  const initialInspections = [
    [701, 601, 6.5, "Elena Rostova"],
    [702, 602, 11.0, "Vikram Patel"],
    [703, 603, 28.5, "Sarah Jenkins"],
    [704, 604, 8.0, "Vikram Patel"],
    [705, 605, 9.5, "Elena Rostova"],
    [706, 606, 32.0, "Kenji Sato"],
    [707, 608, 7.0, "Sarah Jenkins"],
  ];
  for (const ins of initialInspections) inspStmt.run(ins);
  inspStmt.free();

  // 9. Seed MENDING
  const mendStmt = db.prepare(`INSERT OR REPLACE INTO MENDING VALUES (?, ?, ?, ?)`);
  const initialMendings = [
    [801, 703, "Broken Pick at 42m", "REPAIRED"],
    [802, 703, "Warp Float at 78m", "REPAIRED"],
    [803, 706, "Weft Slub at 14m", "IN_PROGRESS"],
    [804, 706, "Starting Mark at 55m", "PENDING"],
    [805, 702, "Small Oil Spot at Selvedge", "REPAIRED"],
  ];
  for (const m of initialMendings) mendStmt.run(m);
  mendStmt.free();

  // 10. Seed PACKED_LOT
  const packStmt = db.prepare(`INSERT OR REPLACE INTO PACKED_LOT VALUES (?, ?, ?, ?)`);
  const initialPackedLots = [
    [901, 601, "PO-TARGET-7741", "2026-09-22"],
    [902, 602, "PO-TARGET-7741", "2026-09-22"],
    [903, 604, "PO-ZARA-9920", "2026-09-24"],
    [904, 605, "PO-HUGO-4412", "2026-09-25"],
    [905, 608, "PO-IKEA-2201", "2026-09-20"],
  ];
  for (const p of initialPackedLots) packStmt.run(p);
  packStmt.free();

  console.log("[SQLite] Successfully populated all 10 ER Diagram tables with authentic manufacturing data.");
}

// =========================================================================
// ERD DATA RETRIEVAL & MUTATION FUNCTIONS
// =========================================================================

function queryTableRows(db: Database, sql: string, params: any[] = []): any[] {
  const res = db.exec(sql, params);
  if (!res || res.length === 0) return [];
  const cols = res[0].columns;
  return res[0].values.map((valArray) => {
    const obj: Record<string, any> = {};
    cols.forEach((col, idx) => {
      obj[col] = valArray[idx];
    });
    return obj;
  });
}

export async function dbGetErdAll(): Promise<WeavingProcessDatabaseState> {
  const db = await getDatabase();
  return {
    yarnLots: queryTableRows(db, "SELECT * FROM YARN_LOT ORDER BY lot_id ASC"),
    warpBeams: queryTableRows(db, "SELECT * FROM WARP_BEAM ORDER BY beam_id ASC"),
    sizedBeams: queryTableRows(db, "SELECT * FROM SIZED_BEAM ORDER BY sized_beam_id ASC"),
    weftPackages: queryTableRows(db, "SELECT * FROM WEFT_PACKAGE ORDER BY package_id ASC"),
    looms: queryTableRows(db, "SELECT * FROM LOOM ORDER BY loom_id ASC"),
    loomJobs: queryTableRows(db, "SELECT * FROM LOOM_JOB ORDER BY job_id ASC"),
    fabricRolls: queryTableRows(db, "SELECT * FROM FABRIC_ROLL ORDER BY roll_id ASC"),
    inspections: queryTableRows(db, "SELECT * FROM INSPECTION ORDER BY inspection_id ASC"),
    mendings: queryTableRows(db, "SELECT * FROM MENDING ORDER BY mending_id ASC"),
    packedLots: queryTableRows(db, "SELECT * FROM PACKED_LOT ORDER BY pack_id ASC"),
  };
}

export async function dbInsertYarnLot(lot: Partial<YarnLotRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(lot_id), 100) + 1 FROM YARN_LOT");
  const lotId = Number(lot.lot_id || nextIdRes[0]?.values[0]?.[0] || 101);
  db.run(
    "INSERT INTO YARN_LOT (lot_id, yarn_count, supplier, received_date) VALUES (?, ?, ?, ?)",
    [lotId, lot.yarn_count || "", lot.supplier || "", lot.received_date || new Date().toISOString().split("T")[0]]
  );
  saveDatabase(db);
  return lotId;
}

export async function dbInsertWarpBeam(beam: Partial<WarpBeamRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(beam_id), 200) + 1 FROM WARP_BEAM");
  const beamId = Number(beam.beam_id || nextIdRes[0]?.values[0]?.[0] || 201);
  db.run(
    "INSERT INTO WARP_BEAM (beam_id, lot_id, total_ends, beam_length) VALUES (?, ?, ?, ?)",
    [beamId, Number(beam.lot_id || 101), Number(beam.total_ends || 6000), Number(beam.beam_length || 4000)]
  );
  saveDatabase(db);
  return beamId;
}

export async function dbInsertSizedBeam(sized: Partial<SizedBeamRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(sized_beam_id), 300) + 1 FROM SIZED_BEAM");
  const sizedBeamId = Number(sized.sized_beam_id || nextIdRes[0]?.values[0]?.[0] || 301);
  db.run(
    "INSERT INTO SIZED_BEAM (sized_beam_id, beam_id, size_recipe, sizing_date) VALUES (?, ?, ?, ?)",
    [sizedBeamId, Number(sized.beam_id || 201), sized.size_recipe || "", sized.sizing_date || new Date().toISOString().split("T")[0]]
  );
  saveDatabase(db);
  return sizedBeamId;
}

export async function dbInsertWeftPackage(pkg: Partial<WeftPackageRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(package_id), 400) + 1 FROM WEFT_PACKAGE");
  const packageId = Number(pkg.package_id || nextIdRes[0]?.values[0]?.[0] || 401);
  db.run(
    "INSERT INTO WEFT_PACKAGE (package_id, lot_id, count) VALUES (?, ?, ?)",
    [packageId, Number(pkg.lot_id || 101), pkg.count || ""]
  );
  saveDatabase(db);
  return packageId;
}

export async function dbInsertLoomJob(job: Partial<LoomJobRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(job_id), 500) + 1 FROM LOOM_JOB");
  const jobId = Number(job.job_id || nextIdRes[0]?.values[0]?.[0] || 501);
  db.run(
    "INSERT INTO LOOM_JOB (job_id, loom_id, sized_beam_id, package_id, article_no, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [jobId, Number(job.loom_id || 1), Number(job.sized_beam_id || 301), Number(job.package_id || 401), job.article_no || "", job.start_date || new Date().toISOString().split("T")[0], job.status || "RUNNING"]
  );
  saveDatabase(db);
  return jobId;
}

export async function dbUpdateLoomJob(jobId: number, updates: Partial<LoomJobRecord>) {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: any[] = [];
  if (updates.status) {
    clauses.push("status = ?");
    params.push(updates.status);
  }
  if (updates.article_no) {
    clauses.push("article_no = ?");
    params.push(updates.article_no);
  }
  if (clauses.length > 0) {
    params.push(jobId);
    db.run(`UPDATE LOOM_JOB SET ${clauses.join(", ")} WHERE job_id = ?`, params);
    saveDatabase(db);
  }
}

export async function dbInsertFabricRoll(roll: Partial<FabricRollRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(roll_id), 600) + 1 FROM FABRIC_ROLL");
  const rollId = Number(roll.roll_id || nextIdRes[0]?.values[0]?.[0] || 601);
  db.run(
    "INSERT INTO FABRIC_ROLL (roll_id, job_id, length_mtrs, grade) VALUES (?, ?, ?, ?)",
    [rollId, Number(roll.job_id || 501), Number(roll.length_mtrs || 100), roll.grade || "Pending Inspection"]
  );
  saveDatabase(db);
  return rollId;
}

export async function dbUpdateFabricRollGrade(rollId: number, grade: string) {
  const db = await getDatabase();
  db.run("UPDATE FABRIC_ROLL SET grade = ? WHERE roll_id = ?", [grade, rollId]);
  saveDatabase(db);
}

export async function dbInsertInspection(insp: Partial<InspectionRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(inspection_id), 700) + 1 FROM INSPECTION");
  const inspectionId = Number(insp.inspection_id || nextIdRes[0]?.values[0]?.[0] || 701);
  db.run(
    "INSERT INTO INSPECTION (inspection_id, roll_id, defect_points, inspector) VALUES (?, ?, ?, ?)",
    [inspectionId, Number(insp.roll_id || 601), Number(insp.defect_points || 0), insp.inspector || "Auditor"]
  );
  // Automatically adjust fabric roll grade based on standard 4-point rule:
  const grade = (insp.defect_points ?? 0) <= 20 ? "Grade A" : (insp.defect_points ?? 0) <= 35 ? "Grade B" : "Grade C";
  db.run("UPDATE FABRIC_ROLL SET grade = ? WHERE roll_id = ?", [grade, Number(insp.roll_id || 601)]);
  saveDatabase(db);
  return inspectionId;
}

export async function dbInsertMending(mend: Partial<MendingRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(mending_id), 800) + 1 FROM MENDING");
  const mendingId = Number(mend.mending_id || nextIdRes[0]?.values[0]?.[0] || 801);
  db.run(
    "INSERT INTO MENDING (mending_id, inspection_id, defect_type, status) VALUES (?, ?, ?, ?)",
    [mendingId, Number(mend.inspection_id || 701), mend.defect_type || "", mend.status || "PENDING"]
  );
  saveDatabase(db);
  return mendingId;
}

export async function dbUpdateMendingStatus(mendingId: number, status: string) {
  const db = await getDatabase();
  db.run("UPDATE MENDING SET status = ? WHERE mending_id = ?", [status, mendingId]);
  saveDatabase(db);
}

export async function dbInsertPackedLot(pack: Partial<PackedLotRecord>) {
  const db = await getDatabase();
  const nextIdRes = db.exec("SELECT COALESCE(MAX(pack_id), 900) + 1 FROM PACKED_LOT");
  const packId = Number(pack.pack_id || nextIdRes[0]?.values[0]?.[0] || 901);
  db.run(
    "INSERT INTO PACKED_LOT (pack_id, roll_id, customer_po, dispatch_date) VALUES (?, ?, ?, ?)",
    [packId, Number(pack.roll_id || 601), pack.customer_po || "", pack.dispatch_date || new Date().toISOString().split("T")[0]]
  );
  saveDatabase(db);
  return packId;
}

/**
 * Multi-table Full Lineage & Pedigree Trace:
 * Connects PACKED_LOT <-> FABRIC_ROLL <-> INSPECTION & MENDING <-> LOOM_JOB <-> LOOM,
 * SIZED_BEAM <-> WARP_BEAM <-> YARN_LOT (warp), and WEFT_PACKAGE <-> YARN_LOT (weft)
 */
export async function dbTraceWeavingPedigree(search: string): Promise<FullLineageTrace | null> {
  const db = await getDatabase();
  const trimmed = search.trim();
  const asNumber = Number(trimmed);

  // Find candidate roll_id
  let rollId: number | null = null;

  if (!isNaN(asNumber)) {
    // Check if it's roll_id
    const rollCheck = db.exec("SELECT roll_id FROM FABRIC_ROLL WHERE roll_id = ?", [asNumber]);
    if (rollCheck && rollCheck[0]?.values && rollCheck[0].values.length > 0) {
      rollId = asNumber;
    } else {
      // Check if it's job_id
      const jobCheck = db.exec("SELECT roll_id FROM FABRIC_ROLL WHERE job_id = ? LIMIT 1", [asNumber]);
      if (jobCheck && jobCheck[0]?.values && jobCheck[0].values.length > 0) {
        rollId = Number(jobCheck[0].values[0][0]);
      } else {
        // Check if pack_id
        const packCheck = db.exec("SELECT roll_id FROM PACKED_LOT WHERE pack_id = ?", [asNumber]);
        if (packCheck && packCheck[0]?.values && packCheck[0].values.length > 0) {
          rollId = Number(packCheck[0].values[0][0]);
        }
      }
    }
  }

  if (rollId === null) {
    // Search by Customer PO or Article No
    const poCheck = db.exec("SELECT roll_id FROM PACKED_LOT WHERE customer_po LIKE ? LIMIT 1", [`%${trimmed}%`]);
    if (poCheck && poCheck[0]?.values && poCheck[0].values.length > 0) {
      rollId = Number(poCheck[0].values[0][0]);
    } else {
      const artCheck = db.exec(`
        SELECT r.roll_id FROM FABRIC_ROLL r
        JOIN LOOM_JOB j ON r.job_id = j.job_id
        WHERE j.article_no LIKE ? LIMIT 1
      `, [`%${trimmed}%`]);
      if (artCheck && artCheck[0]?.values && artCheck[0].values.length > 0) {
        rollId = Number(artCheck[0].values[0][0]);
      }
    }
  }

  if (rollId === null) {
    // Default to first roll
    const defaultCheck = db.exec("SELECT roll_id FROM FABRIC_ROLL LIMIT 1");
    if (defaultCheck && defaultCheck[0]?.values && defaultCheck[0].values.length > 0) {
      rollId = Number(defaultCheck[0].values[0][0]);
    } else {
      return null;
    }
  }

  const rollRows = queryTableRows(db, "SELECT * FROM FABRIC_ROLL WHERE roll_id = ?", [rollId]);
  if (rollRows.length === 0) return null;
  const roll = rollRows[0];

  const jobRows = queryTableRows(db, "SELECT * FROM LOOM_JOB WHERE job_id = ?", [roll.job_id]);
  if (jobRows.length === 0) return null;
  const job = jobRows[0];

  const loomRows = queryTableRows(db, "SELECT * FROM LOOM WHERE loom_id = ?", [job.loom_id]);
  const loom = loomRows[0] || { loom_id: job.loom_id, loom_type: "Standard Loom", reed_width: 190 };

  const sizedRows = queryTableRows(db, "SELECT * FROM SIZED_BEAM WHERE sized_beam_id = ?", [job.sized_beam_id]);
  const sizedBeam = sizedRows[0] || { sized_beam_id: job.sized_beam_id, beam_id: 0, size_recipe: "Standard Sizing", sizing_date: "" };

  const warpRows = queryTableRows(db, "SELECT * FROM WARP_BEAM WHERE beam_id = ?", [sizedBeam.beam_id]);
  const warpBeam = warpRows[0] || { beam_id: sizedBeam.beam_id, lot_id: 0, total_ends: 6400, beam_length: 4000 };

  const warpYarnRows = queryTableRows(db, "SELECT * FROM YARN_LOT WHERE lot_id = ?", [warpBeam.lot_id]);
  const warpYarnLot = warpYarnRows[0] || { lot_id: warpBeam.lot_id, yarn_count: "Warp Yarn", supplier: "Mill Internal", received_date: "" };

  const weftPkgRows = queryTableRows(db, "SELECT * FROM WEFT_PACKAGE WHERE package_id = ?", [job.package_id]);
  const weftPackage = weftPkgRows[0] || { package_id: job.package_id, lot_id: 0, count: "Weft Package" };

  const weftYarnRows = queryTableRows(db, "SELECT * FROM YARN_LOT WHERE lot_id = ?", [weftPackage.lot_id]);
  const weftYarnLot = weftYarnRows[0] || { lot_id: weftPackage.lot_id, yarn_count: "Weft Yarn", supplier: "Mill Internal", received_date: "" };

  const inspRows = queryTableRows(db, "SELECT * FROM INSPECTION WHERE roll_id = ?", [roll.roll_id]);
  const inspection = inspRows[0] || undefined;

  let mendings: any[] = [];
  if (inspection) {
    mendings = queryTableRows(db, "SELECT * FROM MENDING WHERE inspection_id = ?", [inspection.inspection_id]);
  }

  const packedRows = queryTableRows(db, "SELECT * FROM PACKED_LOT WHERE roll_id = ?", [roll.roll_id]);
  const packedLot = packedRows[0] || undefined;

  return {
    roll,
    job,
    loom,
    sizedBeam,
    warpBeam,
    warpYarnLot,
    weftPackage,
    weftYarnLot,
    inspection,
    mendings,
    packedLot,
  };
}


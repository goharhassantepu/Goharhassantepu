import React, { useState, useEffect } from "react";
import {
  Database,
  Play,
  RotateCcw,
  TableProperties,
  Copy,
  Check,
  Code2,
  Terminal,
  Download,
  Search,
  HardDrive,
  RefreshCw,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { ApexTheme } from "../types";
import {
  executeSql,
  fetchTableSummaries,
  resetDatabaseToFactory,
  TableSummary,
  SqlQueryResult,
} from "../services/dbService";

interface DatabaseStudioPageProps {
  theme: ApexTheme;
  onRefreshData?: () => void;
}

const PRESET_QUERIES = [
  {
    name: "1. High Efficiency Looms (> 90% OEE)",
    category: "Telemetry",
    sql: `SELECT id, name, model, shed, status, rpm, oee, efficiency, total_meters_shift
FROM LOOM_TELEMETRY 
WHERE oee >= 90.0 
ORDER BY oee DESC;`,
  },
  {
    name: "2. Critical Yarn Shortages (Below Threshold)",
    category: "Inventory",
    sql: `SELECT lot_number, yarn_type, current_stock_kg, min_threshold_kg, rack_location, unit_price_per_kg
FROM THREAD_INVENTORY 
WHERE current_stock_kg <= min_threshold_kg 
ORDER BY (current_stock_kg - min_threshold_kg) ASC;`,
  },
  {
    name: "3. Warp Beams Nearing Run-out (< 1000m)",
    category: "Production",
    sql: `SELECT beam_code, assigned_loom_id, remaining_length_meters, total_length_meters, status, estimated_runout_hours
FROM WARP_BEAMS 
WHERE remaining_length_meters < 1000 
ORDER BY remaining_length_meters ASC;`,
  },
  {
    name: "4. Downtime Incident Breakdown by Type",
    category: "Analytics",
    sql: `SELECT type, COUNT(*) AS incident_count, SUM(duration_minutes) AS total_lost_minutes, AVG(duration_minutes) AS avg_duration_minutes
FROM DOWNTIME_LOGS 
GROUP BY type 
ORDER BY total_lost_minutes DESC;`,
  },
  {
    name: "5. Production Output by Weave Shed",
    category: "Analytics",
    sql: `SELECT shed, COUNT(*) AS loom_count, AVG(oee) AS avg_oee, SUM(total_meters_shift) AS total_linear_meters, SUM(total_picks_shift) AS total_picks
FROM LOOM_TELEMETRY 
GROUP BY shed 
ORDER BY total_linear_meters DESC;`,
  },
  {
    name: "6. Insert Custom Test Yarn Lot",
    category: "DML",
    sql: `INSERT INTO THREAD_INVENTORY (
  id, lot_number, yarn_type, count_specification, color, color_hex, supplier,
  materialCategory, current_stock_kg, min_threshold_kg, allocated_looms,
  rack_location, unit_price_per_kg, batch_moisture_regain, tested_tensile_strength
) VALUES (
  'LOT-EXP-' || hex(randomblob(2)), 'LOT-EXP-990', 'Expedition Dyneema Ripstop',
  '400D/96F', 'Stealth Black', '#1e293b', 'DSM Dyneema Netherlands', 'Both',
  240.0, 50.0, '["LM-302","LM-303"]', 'Warehouse-C / Bay 01 / Shelf 1',
  28.50, 0.4, 38.4
);`,
  },
  {
    name: "7. Update Loom Target RPM (High Speed Airjets)",
    category: "DML",
    sql: `UPDATE LOOM_TELEMETRY 
SET target_rpm = 1050 
WHERE type = 'Air Jet';`,
  },
  {
    name: "8. View Complete Shift Audit Log",
    category: "Audit",
    sql: `SELECT id, shift_name, date, shift_manager, total_meters_produced, average_oee, signoff_status
FROM SHIFT_REPORTS 
ORDER BY date DESC;`,
  },
];

export const DatabaseStudioPage: React.FC<DatabaseStudioPageProps> = ({
  theme,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<"sql" | "browser" | "diagnostics">("sql");
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("LOOM_TELEMETRY");
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial tables and run default query
  useEffect(() => {
    loadTables();
    handleRunQuery(PRESET_QUERIES[0].sql);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadTables = async () => {
    const data = await fetchTableSummaries();
    setTables(data);
  };

  const handleRunQuery = async (sqlToExecute: string) => {
    setIsExecuting(true);
    try {
      const res = await executeSql(sqlToExecute);
      setQueryResult(res);
      if (res.success && !sqlToExecute.trim().toUpperCase().startsWith("SELECT")) {
        loadTables();
        if (onRefreshData) onRefreshData();
      }
    } catch (err: any) {
      setQueryResult({
        success: false,
        error: err?.message || "Execution failed",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    // Fetch first 50 rows of this table
    const res = await executeSql(`SELECT * FROM ${tableName} LIMIT 50;`);
    if (res.success && res.columns && res.rows) {
      setTableData({
        columns: res.columns,
        rows: res.rows,
      });
    }
  };

  const handleResetFactory = async () => {
    if (!window.confirm("Are you sure you want to re-seed all tables to factory defaults?")) return;
    setIsResetting(true);
    const ok = await resetDatabaseToFactory();
    setIsResetting(false);
    if (ok) {
      showToast("Database successfully restored to pristine factory baseline.");
      loadTables();
      handleRunQuery(query);
      if (onRefreshData) onRefreshData();
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const exportResultCsv = () => {
    if (!queryResult || !queryResult.columns || !queryResult.rows || queryResult.rows.length === 0) return;
    const header = queryResult.columns.join(",");
    const rows = queryResult.rows.map((r) =>
      queryResult.columns!.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")
    );
    const csvContent = [header, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `apex_query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-md shadow-xl text-xs font-semibold flex items-center space-x-2 border border-emerald-500 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* APEX Page Hero Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Page 50: Database & SQL Workshop
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE & PERSISTENT</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Oracle APEX Enterprise relational query environment powered by high-performance SQLite engine with ACID file storage.
              </p>
            </div>
          </div>
        </div>

        {/* Database Status Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 flex items-center space-x-2">
            <Server className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-slate-600 dark:text-slate-300">Schema:</span>
            <span className="font-bold text-slate-900 dark:text-white">WEAVETEC_PROD</span>
          </div>

          <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded border border-slate-200 dark:border-slate-700 flex items-center space-x-2">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-slate-600 dark:text-slate-300">Tables:</span>
            <span className="font-bold text-slate-900 dark:text-white">{tables.length || 7}</span>
          </div>

          <button
            onClick={handleResetFactory}
            disabled={isResetting}
            title="Reset tables to default seed data"
            className="px-3 py-1.5 rounded font-sans font-medium text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
            <span>{isResetting ? "Resetting..." : "Reset Factory Seed"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1">
        <button
          onClick={() => setActiveTab("sql")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "sql"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>SQL Commands Runner</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("browser");
            if (tables.length > 0 && (!tableData || tableData.rows.length === 0)) {
              handleSelectTable(selectedTable);
            }
          }}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "browser"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <TableProperties className="w-4 h-4" />
          <span>Object Browser & Table Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === "diagnostics"
              ? "border-amber-500 text-amber-600 dark:text-amber-400 font-bold"
              : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Database Architecture & Storage</span>
        </button>
      </div>

      {/* Tab 1: SQL Commands Runner */}
      {activeTab === "sql" && (
        <div className="space-y-4">
          {/* Query Selection & Control Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Production Query:
                </span>
                <select
                  aria-label="Preset SQL Queries"
                  onChange={(e) => {
                    const found = PRESET_QUERIES.find((q) => q.name === e.target.value);
                    if (found) {
                      setQuery(found.sql);
                      handleRunQuery(found.sql);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-xs font-sans text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {PRESET_QUERIES.map((q) => (
                    <option key={q.name} value={q.name}>
                      [{q.category}] {q.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={copyQuery}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy SQL"}</span>
                </button>

                {queryResult?.rows && queryResult.rows.length > 0 && (
                  <button
                    onClick={exportResultCsv}
                    className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-500" />
                    <span>Export CSV</span>
                  </button>
                )}

                <button
                  onClick={() => handleRunQuery(query)}
                  disabled={isExecuting}
                  className="px-4 py-1.5 rounded font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Play className={`w-3.5 h-3.5 ${isExecuting ? "animate-spin" : ""}`} />
                  <span>{isExecuting ? "Running..." : "Run Query"}</span>
                </button>
              </div>
            </div>

            {/* SQL Code Input Area */}
            <div className="relative rounded-md overflow-hidden border border-slate-800">
              <div className="bg-slate-950 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 select-none">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300">WEAVETEC_PROD.SQL</span>
                </div>
                <span className="text-[10px] text-slate-500">Supports ANSI SQL, SQLite 3 DDL/DML, JOINs, aggregations</span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={5}
                spellCheck={false}
                className="w-full p-3 bg-slate-900 text-amber-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y leading-relaxed"
                placeholder="Enter SQL statement..."
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Header info */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Execution Output:</span>
                {queryResult?.success && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {queryResult.rowCount !== undefined
                        ? `${queryResult.rowCount} rows fetched`
                        : queryResult.message || "Executed successfully"}
                    </span>
                  </span>
                )}
                {queryResult && !queryResult.success && (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Error</span>
                  </span>
                )}
              </div>

              {queryResult?.executionTimeMs !== undefined && (
                <div className="flex items-center space-x-1 text-slate-500 text-[11px]">
                  <Clock className="w-3 h-3" />
                  <span>{queryResult.executionTimeMs} ms</span>
                </div>
              )}
            </div>

            {/* Error message */}
            {queryResult && !queryResult.success && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs font-mono border-b border-rose-200 dark:border-rose-900">
                <p className="font-bold mb-1">SQL Execution Failure:</p>
                <p>{queryResult.error}</p>
              </div>
            )}

            {/* Table Grid */}
            {queryResult?.columns && queryResult.columns.length > 0 && queryResult.rows && (
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs whitespace-nowrap font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5 w-10 text-center text-slate-400">#</th>
                      {queryResult.columns.map((c) => (
                        <th key={c} className="p-2.5">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] text-slate-800 dark:text-slate-200">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-2.5 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                          {idx + 1}
                        </td>
                        {queryResult.columns!.map((c) => (
                          <td key={c} className="p-2.5">
                            {row[c] !== null && row[c] !== undefined ? (
                              typeof row[c] === "number" ? (
                                <span className="text-sky-600 dark:text-sky-400">{row[c]}</span>
                              ) : (
                                String(row[c])
                              )
                            ) : (
                              <span className="text-slate-400 italic">NULL</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {queryResult?.success && (!queryResult.columns || queryResult.columns.length === 0) && (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  {queryResult.message || "Statement executed successfully."}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Changes are persisted to database file on server.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Object Browser & Table Inspector */}
      {activeTab === "browser" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Left Table List */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-3 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Database Tables ({tables.length})
              </span>
              <button
                onClick={loadTables}
                title="Refresh table list"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              {tables.map((tbl) => (
                <button
                  key={tbl.tableName}
                  onClick={() => handleSelectTable(tbl.tableName)}
                  className={`w-full text-left p-2 rounded text-xs font-mono flex items-center justify-between transition-colors ${
                    selectedTable === tbl.tableName
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <TableProperties className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tbl.tableName}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {tbl.rowCount} rows
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Table Details */}
          <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {selectedTable}
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono">
                    {tables.find((t) => t.tableName === selectedTable)?.rowCount || 0} Total Records
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Schema columns, data types, primary key constraints, and live sample preview.
                </p>
              </div>

              <button
                onClick={() => {
                  setQuery(`SELECT * FROM ${selectedTable} LIMIT 100;`);
                  setActiveTab("sql");
                  handleRunQuery(`SELECT * FROM ${selectedTable} LIMIT 100;`);
                }}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center space-x-1.5 shadow-xs transition-colors"
              >
                <span>Query in SQL Editor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Column Schema Definition */}
            <div>
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Table Columns & Schema Specification
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2">Column Name</th>
                      <th className="p-2">Data Type</th>
                      <th className="p-2">Nullability</th>
                      <th className="p-2">Key Constraint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                    {tables
                      .find((t) => t.tableName === selectedTable)
                      ?.columns.map((c) => (
                        <tr key={c.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 font-semibold text-slate-900 dark:text-white">{c.name}</td>
                          <td className="p-2 text-sky-600 dark:text-sky-400">{c.type}</td>
                          <td className="p-2 text-slate-500">{c.notnull ? "NOT NULL" : "NULLABLE"}</td>
                          <td className="p-2">
                            {c.pk ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                                PRIMARY KEY
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Data Records Preview */}
            {tableData && tableData.rows.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Live Records Preview (First {tableData.rows.length} rows)
                </h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto max-h-[350px]">
                  <table className="w-full text-left text-xs font-mono whitespace-nowrap">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] uppercase font-bold sticky top-0">
                      <tr>
                        {tableData.columns.map((col) => (
                          <th key={col} className="p-2">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {tableData.columns.map((col) => (
                            <td key={col} className="p-2">
                              {String(row[col] ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Database Diagnostics & Architecture */}
      {activeTab === "diagnostics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <HardDrive className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Physical Storage & Persistence Architecture
              </h3>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                The weaving management system utilizes an enterprise relational database engine running server-side in Node.js.
              </p>
              <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1.5">
                <div><strong>Database Path:</strong> /data/weavetec_enterprise.sqlite</div>
                <div><strong>Engine Version:</strong> SQLite 3.x (WebAssembly/Native C-Core)</div>
                <div><strong>Transactions:</strong> Full ACID Compliance (Atomic, Consistent, Isolated, Durable)</div>
                <div><strong>Active Synchronized Tables:</strong> 7 Relational Schemas</div>
                <div><strong>Encoding:</strong> UTF-8</div>
              </div>
              <p>
                All telemetry events, yarn lot receipts, warp beam mounts, downtime logs, and automated AI shift reports are written transactionally to disk.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Data Integrity & Factory Baseline Restore
              </h3>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
              <p>
                If you execute test DML modifications (e.g. inserting experimental yarn lots or updating loom speeds), you can easily revert back to the verified textile plant baseline.
              </p>
              <button
                onClick={handleResetFactory}
                disabled={isResetting}
                className="w-full py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors"
              >
                <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
                <span>{isResetting ? "Re-seeding..." : "Reset All Tables to Initial Textile Mill Baseline"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from "react";
import {
  Database,
  Play,
  RotateCcw,
  TableProperties,
  Copy,
  Check,
  Code2,
  Terminal,
} from "lucide-react";
import { LoomTelemetry, ThreadLot, WarpBeam, PatternCycle, ApexTheme } from "../types";
import { executeSql } from "../services/dbService";

interface SqlConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  looms: LoomTelemetry[];
  threadLots: ThreadLot[];
  warpBeams: WarpBeam[];
  patterns: PatternCycle[];
  theme: ApexTheme;
  onRefreshData?: () => void;
  initialQuery?: string;
}

const SAMPLE_QUERIES = [
  {
    name: "1. Weaving ERD Full Lineage Pedigree (10-Table Join)",
    sql: `SELECT 
  p.customer_po,
  p.dispatch_date,
  r.roll_id,
  r.length_mtrs,
  r.grade,
  j.article_no,
  l.loom_type,
  y_warp.supplier AS warp_supplier,
  y_warp.yarn_count AS warp_yarn,
  y_weft.yarn_count AS weft_yarn,
  i.defect_points,
  i.inspector
FROM PACKED_LOT p
JOIN FABRIC_ROLL r ON p.roll_id = r.roll_id
JOIN LOOM_JOB j ON r.job_id = j.job_id
JOIN LOOM l ON j.loom_id = l.loom_id
JOIN SIZED_BEAM sb ON j.sized_beam_id = sb.sized_beam_id
JOIN WARP_BEAM wb ON sb.beam_id = wb.beam_id
JOIN YARN_LOT y_warp ON wb.lot_id = y_warp.lot_id
JOIN WEFT_PACKAGE wp ON j.package_id = wp.package_id
JOIN YARN_LOT y_weft ON wp.lot_id = y_weft.lot_id
LEFT JOIN INSPECTION i ON r.roll_id = i.roll_id;`,
  },
  {
    name: "2. Fabric Rolls & Inspection Defect Scoring",
    sql: `SELECT r.roll_id, r.length_mtrs, r.grade, i.defect_points, i.inspector, m.defect_type, m.status AS mending_status
FROM FABRIC_ROLL r
LEFT JOIN INSPECTION i ON r.roll_id = i.roll_id
LEFT JOIN MENDING m ON i.inspection_id = m.inspection_id
ORDER BY r.roll_id ASC;`,
  },
  {
    name: "3. Warp Beams & Chemical Sizing Lineage",
    sql: `SELECT wb.beam_id, wb.total_ends, wb.beam_length, sb.sized_beam_id, sb.size_recipe, y.supplier, y.yarn_count
FROM WARP_BEAM wb
JOIN SIZED_BEAM sb ON wb.beam_id = sb.beam_id
JOIN YARN_LOT y ON wb.lot_id = y.lot_id;`,
  },
  {
    name: "4. High Efficiency Looms (> 90% OEE)",
    sql: "SELECT id, model, shed, status, rpm, oee FROM LOOM_TELEMETRY WHERE oee >= 90.0 ORDER BY oee DESC;",
  },
  {
    name: "5. Critical Thread Inventory Shortages",
    sql: "SELECT lot_number, yarn_type, current_stock_kg, min_threshold_kg, rack_location FROM THREAD_INVENTORY WHERE current_stock_kg <= min_threshold_kg;",
  },
];

export const SqlConsoleModal: React.FC<SqlConsoleModalProps> = ({
  isOpen,
  onClose,
  looms,
  threadLots,
  warpBeams,
  patterns,
  theme,
  onRefreshData,
  initialQuery,
}) => {
  const [query, setQuery] = useState(initialQuery || SAMPLE_QUERIES[0].sql);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [resultRows, setResultRows] = useState<any[]>([]);
  const [executionTime, setExecutionTime] = useState<number>(0.003);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const q = initialQuery || query;
      if (initialQuery) setQuery(initialQuery);
      handleRunQuery(q);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleRunQuery = async (sqlToRun: string) => {
    setIsExecuting(true);
    setError(null);
    try {
      const res = await executeSql(sqlToRun);
      if (res.success) {
        if (res.columns && res.rows) {
          setResultColumns(res.columns);
          setResultRows(res.rows);
          setExecutionTime(Number(((res.executionTimeMs || 3) / 1000).toFixed(4)));
        } else {
          setResultColumns(["STATUS", "MESSAGE"]);
          setResultRows([{ STATUS: "OK", MESSAGE: res.message || "Executed successfully" }]);
          setExecutionTime(Number(((res.executionTimeMs || 3) / 1000).toFixed(4)));
        }
        if (onRefreshData && !sqlToRun.trim().toUpperCase().startsWith("SELECT")) {
          onRefreshData();
        }
      } else {
        setError(res.error || "Execution error");
      }
    } catch (err: any) {
      setError(err?.message || "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 select-none">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold font-mono text-xs">
              SQL
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight flex items-center space-x-2">
                <span>Oracle APEX SQL Workshop — SQL Commands</span>
                <span className="text-[10px] bg-slate-700 px-1.5 py-0.2 rounded font-mono text-amber-300">
                  SCHEMA: WEAVETEC_PROD
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg leading-none font-bold"
          >
            ×
          </button>
        </div>

        {/* Quick Query Selector */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Saved SQL Queries:</span>
            <select
              onChange={(e) => {
                const found = SAMPLE_QUERIES.find((q) => q.name === e.target.value);
                if (found) {
                  setQuery(found.sql);
                  handleRunQuery(found.sql);
                }
              }}
              aria-label="Saved SQL Queries"
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-900 dark:text-white"
            >
              {SAMPLE_QUERIES.map((q) => (
                <option key={q.name} value={q.name}>
                  {q.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copySql}
              className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center space-x-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copied" : "Copy SQL"}</span>
            </button>

            <button
              onClick={() => handleRunQuery(query)}
              className="px-3 py-1 rounded font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center space-x-1.5 shadow-xs"
            >
              <Play className="w-3 h-3" />
              <span>Run (Ctrl+Enter)</span>
            </button>
          </div>
        </div>

        {/* SQL Input Area */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={3}
            className="w-full p-2.5 rounded bg-slate-900 text-amber-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            placeholder="Type standard Oracle SQL query (SELECT * FROM LOOM_TELEMETRY;)..."
          />
        </div>

        {/* Query Result Region */}
        <div className="p-3 flex-1 overflow-y-auto space-y-2">
          {error && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded text-rose-700 dark:text-rose-300 font-mono text-[11px]">
              <span className="font-bold">SQL Error: </span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>Result Set:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {isExecuting ? "Executing query..." : `${resultRows.length} rows returned in ${executionTime} seconds`}
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800 dark:text-slate-200 whitespace-nowrap font-mono">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase font-bold">
                <tr>
                  {resultColumns.map((c) => (
                    <th key={c} className="p-2">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {resultRows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {resultColumns.map((c) => (
                      <td key={c} className="p-2">
                        {String(r[c] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-slate-500 font-mono text-[11px]">
          <span>Database: Oracle Database 23ai Enterprise • Autonomous Textile Engine</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-sans font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

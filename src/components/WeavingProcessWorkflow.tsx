import React, { useState, useEffect, useMemo } from "react";
import {
  Network,
  Layers,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  Cpu,
  FileCheck,
  Truck,
  Scissors,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  Database,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Barcode,
  ExternalLink,
} from "lucide-react";
import {
  ApexTheme,
  WeavingProcessDatabaseState,
  FullLineageTrace,
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
} from "../types";
import {
  fetchErdAll,
  fetchErdTrace,
  insertYarnLotInDb,
  insertWarpBeamInDb,
  insertSizedBeamInDb,
  insertWeftPackageInDb,
  insertLoomJobInDb,
  updateLoomJobStatusInDb,
  insertFabricRollInDb,
  insertInspectionInDb,
  insertMendingInDb,
  updateMendingStatusInDb,
  insertPackedLotInDb,
} from "../services/dbService";

interface WeavingProcessWorkflowProps {
  theme: ApexTheme;
  onOpenSqlWithQuery?: (sql: string) => void;
}

type ErdTableKey =
  | "YARN_LOT"
  | "WARP_BEAM"
  | "SIZED_BEAM"
  | "WEFT_PACKAGE"
  | "LOOM"
  | "LOOM_JOB"
  | "FABRIC_ROLL"
  | "INSPECTION"
  | "MENDING"
  | "PACKED_LOT";

export const WeavingProcessWorkflow: React.FC<WeavingProcessWorkflowProps> = ({
  theme,
  onOpenSqlWithQuery,
}) => {
  const [activeTab, setActiveTab] = useState<"diagram" | "trace" | "tables" | "operations">("diagram");
  const [erdData, setErdData] = useState<WeavingProcessDatabaseState | null>(null);
  const [selectedTable, setSelectedTable] = useState<ErdTableKey>("LOOM_JOB");
  const [tableSearch, setTableSearch] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Lineage Trace State
  const [traceQuery, setTraceQuery] = useState<string>("PO-TARGET-7741");
  const [activeTrace, setActiveTrace] = useState<FullLineageTrace | null>(null);
  const [isTracing, setIsTracing] = useState<boolean>(false);

  // Modals for record creation
  const [activeModal, setActiveModal] = useState<ErdTableKey | null>(null);

  // Load all ER data
  const loadErdData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchErdAll();
      if (data) setErdData(data);
    } catch (err) {
      console.error("Failed to load ERD state:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadErdData();
  }, []);

  // Run initial trace
  useEffect(() => {
    if (traceQuery) {
      handleRunTrace(traceQuery);
    }
  }, []);

  const handleRunTrace = async (q: string) => {
    if (!q) return;
    setIsTracing(true);
    try {
      const res = await fetchErdTrace(q);
      setActiveTrace(res);
    } catch (err) {
      console.error("Trace error:", err);
    } finally {
      setIsTracing(false);
    }
  };

  // ER Table Meta definitions matching weaving_process_erd.html
  const ERD_METAS: Record<
    ErdTableKey,
    {
      title: string;
      icon: any;
      pk: string;
      fks: string[];
      description: string;
      color: string;
      borderColor: string;
      lightBg: string;
      darkBg: string;
      relationships: { target: ErdTableKey; label: string }[];
    }
  > = {
    YARN_LOT: {
      title: "YARN_LOT",
      icon: Barcode,
      pk: "lot_id",
      fks: [],
      description: "Raw yarn supply lots with yarn count specification and receiving dates.",
      color: "text-amber-400",
      borderColor: "border-amber-500/40",
      lightBg: "bg-amber-500/10",
      darkBg: "bg-amber-950/20",
      relationships: [
        { target: "WARP_BEAM", label: "feeds" },
        { target: "WEFT_PACKAGE", label: "feeds" },
      ],
    },
    WARP_BEAM: {
      title: "WARP_BEAM",
      icon: Layers,
      pk: "beam_id",
      fks: ["lot_id -> YARN_LOT"],
      description: "Direct warped beams prepared with total ends and specified length in meters.",
      color: "text-blue-400",
      borderColor: "border-blue-500/40",
      lightBg: "bg-blue-500/10",
      darkBg: "bg-blue-950/20",
      relationships: [{ target: "SIZED_BEAM", label: "sized_into" }],
    },
    SIZED_BEAM: {
      title: "SIZED_BEAM",
      icon: Sparkles,
      pk: "sized_beam_id",
      fks: ["beam_id -> WARP_BEAM"],
      description: "Sizing machine output treated with chemical recipe for weaving tensile strength.",
      color: "text-cyan-400",
      borderColor: "border-cyan-500/40",
      lightBg: "bg-cyan-500/10",
      darkBg: "bg-cyan-950/20",
      relationships: [{ target: "LOOM_JOB", label: "mounted_on" }],
    },
    WEFT_PACKAGE: {
      title: "WEFT_PACKAGE",
      icon: Package,
      pk: "package_id",
      fks: ["lot_id -> YARN_LOT"],
      description: "Weft yarn cones and packages mounted on weft accumulators and creels.",
      color: "text-orange-400",
      borderColor: "border-orange-500/40",
      lightBg: "bg-orange-500/10",
      darkBg: "bg-orange-950/20",
      relationships: [{ target: "LOOM_JOB", label: "supplies" }],
    },
    LOOM: {
      title: "LOOM",
      icon: Cpu,
      pk: "loom_id",
      fks: [],
      description: "Weaving machine physical unit (Air Jet, Rapier, Jacquard) with reed width.",
      color: "text-emerald-400",
      borderColor: "border-emerald-500/40",
      lightBg: "bg-emerald-500/10",
      darkBg: "bg-emerald-950/20",
      relationships: [{ target: "LOOM_JOB", label: "runs" }],
    },
    LOOM_JOB: {
      title: "LOOM_JOB",
      icon: Clock,
      pk: "job_id",
      fks: ["loom_id -> LOOM", "sized_beam_id -> SIZED_BEAM", "package_id -> WEFT_PACKAGE"],
      description: "Production run executing an article weave on a designated loom with warp & weft.",
      color: "text-indigo-400",
      borderColor: "border-indigo-500/40",
      lightBg: "bg-indigo-500/10",
      darkBg: "bg-indigo-950/20",
      relationships: [{ target: "FABRIC_ROLL", label: "produces" }],
    },
    FABRIC_ROLL: {
      title: "FABRIC_ROLL",
      icon: Layers,
      pk: "roll_id",
      fks: ["job_id -> LOOM_JOB"],
      description: "Doffed continuous roll of woven textile with measured length and quality grade.",
      color: "text-violet-400",
      borderColor: "border-violet-500/40",
      lightBg: "bg-violet-500/10",
      darkBg: "bg-violet-950/20",
      relationships: [
        { target: "INSPECTION", label: "inspected_by" },
        { target: "PACKED_LOT", label: "packed_into" },
      ],
    },
    INSPECTION: {
      title: "INSPECTION",
      icon: FileCheck,
      pk: "inspection_id",
      fks: ["roll_id -> FABRIC_ROLL"],
      description: "Perch frame 4-point inspection record with defect point calculation and auditor.",
      color: "text-pink-400",
      borderColor: "border-pink-500/40",
      lightBg: "bg-pink-500/10",
      darkBg: "bg-pink-950/20",
      relationships: [{ target: "MENDING", label: "flags" }],
    },
    MENDING: {
      title: "MENDING",
      icon: Scissors,
      pk: "mending_id",
      fks: ["inspection_id -> INSPECTION"],
      description: "Burling and mending defect repair workstation queue and restoration status.",
      color: "text-rose-400",
      borderColor: "border-rose-500/40",
      lightBg: "bg-rose-500/10",
      darkBg: "bg-rose-950/20",
      relationships: [],
    },
    PACKED_LOT: {
      title: "PACKED_LOT",
      icon: Truck,
      pk: "pack_id",
      fks: ["roll_id -> FABRIC_ROLL (1:1)"],
      description: "Finished customer export packaging container linked to Customer PO and dispatch.",
      color: "text-teal-400",
      borderColor: "border-teal-500/40",
      lightBg: "bg-teal-500/10",
      darkBg: "bg-teal-950/20",
      relationships: [],
    },
  };

  // Form states for adding records
  const [newYarnLot, setNewYarnLot] = useState({ yarn_count: "Ne 50/1 Combed Compact", supplier: "Alps Cotspin Ltd", received_date: new Date().toISOString().split("T")[0] });
  const [newWarpBeam, setNewWarpBeam] = useState({ lot_id: 101, total_ends: 7200, beam_length: 4800 });
  const [newSizedBeam, setNewSizedBeam] = useState({ beam_id: 201, size_recipe: "PVA 5% + Modified Tapioca 5% + Wax 0.6%", sizing_date: new Date().toISOString().split("T")[0] });
  const [newWeftPackage, setNewWeftPackage] = useState({ lot_id: 101, count: "Ne 50/1" });
  const [newLoomJob, setNewLoomJob] = useState({ loom_id: 1, sized_beam_id: 301, package_id: 401, article_no: "ART-CHAMBRAY-115", start_date: new Date().toISOString().split("T")[0], status: "RUNNING" as const });
  const [newFabricRoll, setNewFabricRoll] = useState({ job_id: 501, length_mtrs: 110.0, grade: "Pending Inspection" as const });
  const [newInspection, setNewInspection] = useState({ roll_id: 601, defect_points: 12.0, inspector: "Vikram Patel" });
  const [newMending, setNewMending] = useState({ inspection_id: 701, defect_type: "Minor Broken Pick at 33m", status: "PENDING" as const });
  const [newPackedLot, setNewPackedLot] = useState({ roll_id: 601, customer_po: "PO-NORDSTROM-8812", dispatch_date: new Date().toISOString().split("T")[0] });

  // Creation Submissions
  const handleCreateYarnLot = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertYarnLotInDb(newYarnLot);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateWarpBeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertWarpBeamInDb(newWarpBeam);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateSizedBeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertSizedBeamInDb(newSizedBeam);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateWeftPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertWeftPackageInDb(newWeftPackage);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateLoomJob = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertLoomJobInDb(newLoomJob);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateFabricRoll = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertFabricRollInDb(newFabricRoll);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertInspectionInDb(newInspection);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreateMending = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertMendingInDb(newMending);
    setActiveModal(null);
    loadErdData();
  };

  const handleCreatePackedLot = async (e: React.FormEvent) => {
    e.preventDefault();
    await insertPackedLotInDb(newPackedLot);
    setActiveModal(null);
    loadErdData();
  };

  // Get records for current selected table
  const currentTableRecords = useMemo(() => {
    if (!erdData) return [];
    switch (selectedTable) {
      case "YARN_LOT":
        return erdData.yarnLots || [];
      case "WARP_BEAM":
        return erdData.warpBeams || [];
      case "SIZED_BEAM":
        return erdData.sizedBeams || [];
      case "WEFT_PACKAGE":
        return erdData.weftPackages || [];
      case "LOOM":
        return erdData.looms || [];
      case "LOOM_JOB":
        return erdData.loomJobs || [];
      case "FABRIC_ROLL":
        return erdData.fabricRolls || [];
      case "INSPECTION":
        return erdData.inspections || [];
      case "MENDING":
        return erdData.mendings || [];
      case "PACKED_LOT":
        return erdData.packedLots || [];
      default:
        return [];
    }
  }, [erdData, selectedTable]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    if (!tableSearch) return currentTableRecords;
    const q = tableSearch.toLowerCase();
    return currentTableRecords.filter((row: any) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [currentTableRecords, tableSearch]);

  const cardBg =
    theme === "redwood"
      ? "bg-[#252220] border-[#3d3733]"
      : theme === "dark"
      ? "bg-slate-900 border-slate-800"
      : "bg-white border-slate-200";

  const headerBg =
    theme === "redwood"
      ? "bg-[#2c2825] border-[#3d3733]"
      : theme === "dark"
      ? "bg-slate-800/80 border-slate-700"
      : "bg-slate-50 border-slate-200";

  return (
    <div className="space-y-6">
      {/* Top Banner & Title Bar */}
      <div className={`p-5 rounded-xl border ${cardBg} shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Weaving Process ER Diagram Architecture</h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                10 Relational Tables
              </span>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                weaving_process_erd.html
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              End-to-end textile data pipeline connecting raw yarn lots to sized warp beams, weft packages, loom jobs, fabric inspection, mending, and packed customer dispatch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("diagram")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "diagram"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Interactive ER Map
            </button>
            <button
              onClick={() => setActiveTab("trace")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "trace"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Pedigree Trace
            </button>
            <button
              onClick={() => setActiveTab("tables")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "tables"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              APEX Grid
            </button>
            <button
              onClick={() => setActiveTab("operations")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "operations"
                  ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Operations Hub
            </button>
          </div>

          <button
            onClick={loadErdData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync
          </button>

          {onOpenSqlWithQuery && (
            <button
              onClick={() =>
                onOpenSqlWithQuery(`-- Weaving Process Full Relational Join
SELECT 
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
LEFT JOIN INSPECTION i ON r.roll_id = i.roll_id;`)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              SQL Studio Join
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INTERACTIVE ER DIAGRAM MAP */}
      {activeTab === "diagram" && (
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border ${cardBg} shadow-sm space-y-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-semibold">Entity-Relationship Visual Topology</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exact schema implementation of weaving_process_erd.html with primary keys (PK), foreign keys (FK), and cardinality.
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Raw Materials
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Warp & Weft Prep
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> Weaving Shed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block"></span> Quality & Pack
                </span>
              </div>
            </div>

            {/* Visual ER Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {(Object.keys(ERD_METAS) as ErdTableKey[]).map((key) => {
                const meta = ERD_METAS[key];
                const Icon = meta.icon;
                const count =
                  key === "YARN_LOT"
                    ? erdData?.yarnLots?.length ?? 0
                    : key === "WARP_BEAM"
                    ? erdData?.warpBeams?.length ?? 0
                    : key === "SIZED_BEAM"
                    ? erdData?.sizedBeams?.length ?? 0
                    : key === "WEFT_PACKAGE"
                    ? erdData?.weftPackages?.length ?? 0
                    : key === "LOOM"
                    ? erdData?.looms?.length ?? 0
                    : key === "LOOM_JOB"
                    ? erdData?.loomJobs?.length ?? 0
                    : key === "FABRIC_ROLL"
                    ? erdData?.fabricRolls?.length ?? 0
                    : key === "INSPECTION"
                    ? erdData?.inspections?.length ?? 0
                    : key === "MENDING"
                    ? erdData?.mendings?.length ?? 0
                    : erdData?.packedLots?.length ?? 0;

                return (
                  <div
                    key={key}
                    onClick={() => {
                      setSelectedTable(key);
                      setActiveTab("tables");
                    }}
                    className={`group relative p-4 rounded-xl border ${meta.borderColor} ${cardBg} hover:shadow-md hover:border-indigo-500 cursor-pointer transition-all flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${meta.lightBg} ${meta.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-sm tracking-tight">{meta.title}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {count}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {meta.description}
                      </p>

                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          <span className="font-semibold">PK</span>
                          <span>{meta.pk}</span>
                        </div>

                        {meta.fks.map((fk, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[11px]"
                          >
                            <span className="font-semibold">FK</span>
                            <span className="truncate">{fk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {meta.relationships.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                          Relations
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {meta.relationships.map((rel, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                              <span className="italic text-indigo-500">{rel.label}</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span className="font-semibold">{rel.target}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mermaid ER Diagram Code & Flow Explanation */}
            <div className={`p-4 rounded-xl border ${headerBg} font-mono text-xs overflow-x-auto`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-500" />
                  Mermaid ER Relationship Specification
                </span>
                <span className="text-slate-400 text-[11px]">weaving_process_erd.html</span>
              </div>
              <pre className="text-slate-600 dark:text-slate-300 leading-relaxed overflow-x-auto p-2 bg-black/5 dark:bg-black/30 rounded">
{`erDiagram
  YARN_LOT ||--o{ WARP_BEAM : feeds
  YARN_LOT ||--o{ WEFT_PACKAGE : feeds
  WARP_BEAM ||--o{ SIZED_BEAM : sized_into
  SIZED_BEAM ||--o{ LOOM_JOB : mounted_on
  WEFT_PACKAGE ||--o{ LOOM_JOB : supplies
  LOOM ||--o{ LOOM_JOB : runs
  LOOM_JOB ||--o{ FABRIC_ROLL : produces
  FABRIC_ROLL ||--o{ INSPECTION : inspected_by
  INSPECTION ||--o{ MENDING : flags
  FABRIC_ROLL ||--o| PACKED_LOT : packed_into`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PEDIGREE & GENEALOGY TRACE */}
      {activeTab === "trace" && (
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border ${cardBg} shadow-sm space-y-6`}>
            <div>
              <h2 className="text-base font-semibold">End-to-End Weaving Pedigree & Lot Genealogy</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trace complete vertical lineage across all 10 tables: Customer PO $\leftrightarrow$ Fabric Roll $\leftrightarrow$ Inspection & Mending $\leftrightarrow$ Loom Job $\leftrightarrow$ Sized Warp Beam & Weft Package $\leftrightarrow$ Raw Yarn Lots.
              </p>
            </div>

            {/* Search Input */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={traceQuery}
                  onChange={(e) => setTraceQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunTrace(traceQuery)}
                  placeholder="Search by Customer PO (PO-TARGET-7741), Roll ID (601), Job ID (501), or Article..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                onClick={() => handleRunTrace(traceQuery)}
                disabled={isTracing}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {isTracing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                Trace Pedigree
              </button>

              <div className="flex gap-2 text-xs flex-wrap">
                <button
                  onClick={() => {
                    setTraceQuery("PO-TARGET-7741");
                    handleRunTrace("PO-TARGET-7741");
                  }}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 font-mono"
                >
                  PO-TARGET-7741
                </button>
                <button
                  onClick={() => {
                    setTraceQuery("603");
                    handleRunTrace("603");
                  }}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 font-mono"
                >
                  Roll #603 (Mended)
                </button>
                <button
                  onClick={() => {
                    setTraceQuery("ART-JACQUARD-901");
                    handleRunTrace("ART-JACQUARD-901");
                  }}
                  className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 font-mono"
                >
                  ART-JACQUARD-901
                </button>
              </div>
            </div>

            {/* Active Trace Graph Visualization */}
            {activeTrace ? (
              <div className="space-y-6 pt-2">
                {/* 1. Customer Dispatch Banner */}
                {activeTrace.packedLot ? (
                  <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-teal-600 text-white">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-teal-800 dark:text-teal-200">
                            PACKED LOT #{activeTrace.packedLot.pack_id}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-700 dark:text-teal-300 font-mono text-xs font-bold">
                            {activeTrace.packedLot.customer_po}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Scheduled Export Dispatch:{" "}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {activeTrace.packedLot.dispatch_date}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <span className="text-slate-400 block">Assigned Roll</span>
                        <span className="font-bold font-mono text-sm">Roll #{activeTrace.roll.roll_id}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
                    <span>This fabric roll is currently pending packing container assignment.</span>
                    <button
                      onClick={() => {
                        setNewPackedLot((prev) => ({ ...prev, roll_id: activeTrace.roll.roll_id }));
                        setActiveModal("PACKED_LOT");
                      }}
                      className="px-2.5 py-1 rounded bg-teal-600 text-white text-xs font-medium hover:bg-teal-700"
                    >
                      Pack Roll
                    </button>
                  </div>
                )}

                {/* 2. Fabric Roll & Quality Bench */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fabric Roll Details */}
                  <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-violet-500 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        FABRIC_ROLL #{activeTrace.roll.roll_id}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          activeTrace.roll.grade === "Grade A"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : activeTrace.roll.grade === "Grade B"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}
                      >
                        {activeTrace.roll.grade}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 block text-[11px]">Woven Length</span>
                        <span className="font-bold font-mono text-sm">{activeTrace.roll.length_mtrs} meters</span>
                      </div>
                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                        <span className="text-slate-400 block text-[11px]">Produced by Job</span>
                        <span className="font-bold font-mono text-sm">Job #{activeTrace.job.job_id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inspection & Mending */}
                  <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-pink-500 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4" />
                        INSPECTION & MENDING
                      </span>
                      {activeTrace.inspection ? (
                        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                          {activeTrace.inspection.defect_points} Defect Pts
                        </span>
                      ) : (
                        <span className="text-xs text-amber-500">Pending Inspection</span>
                      )}
                    </div>

                    {activeTrace.inspection ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                          <span>Quality Auditor:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {activeTrace.inspection.inspector}
                          </span>
                        </div>

                        {activeTrace.mendings.length > 0 ? (
                          <div className="space-y-1 pt-1">
                            <span className="text-[11px] font-semibold text-rose-500">
                              Mending Defect Tickets ({activeTrace.mendings.length}):
                            </span>
                            {activeTrace.mendings.map((m) => (
                              <div
                                key={m.mending_id}
                                className="flex items-center justify-between p-1.5 rounded bg-rose-500/10 border border-rose-500/20 text-[11px]"
                              >
                                <span className="font-medium text-rose-800 dark:text-rose-300">
                                  {m.defect_type}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    m.status === "REPAIRED"
                                      ? "bg-emerald-500/20 text-emerald-600"
                                      : "bg-amber-500/20 text-amber-600"
                                  }`}
                                >
                                  {m.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> No critical mending defects flagged.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 py-3 text-center">
                        Fabric roll awaiting 4-point frame inspection.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Weaving Shed & Machine Execution */}
                <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" />
                      WEAVING EXECUTION: LOOM_JOB #{activeTrace.job.job_id} on LOOM #{activeTrace.loom.loom_id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/10 text-indigo-500">
                      {activeTrace.job.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[11px]">Article Design</span>
                      <span className="font-bold font-mono">{activeTrace.job.article_no}</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[11px]">Loom Technology</span>
                      <span className="font-bold">{activeTrace.loom.loom_type}</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[11px]">Reed Width</span>
                      <span className="font-bold font-mono">{activeTrace.loom.reed_width} cm</span>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-400 block text-[11px]">Start Date</span>
                      <span className="font-bold font-mono">{activeTrace.job.start_date}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Warp & Weft Feed Lines */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Warp Stream */}
                  <div className={`p-4 rounded-xl border border-blue-500/30 ${cardBg} space-y-3`}>
                    <div className="flex items-center justify-between text-blue-500">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        Warp Lineage (SIZED_BEAM #{activeTrace.sizedBeam.sized_beam_id})
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-blue-500/10 text-blue-900 dark:text-blue-300">
                        <span className="font-semibold block">Sizing Recipe:</span>
                        <span>{activeTrace.sizedBeam.size_recipe}</span>
                      </div>

                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">WARP_BEAM #{activeTrace.warpBeam.beam_id}:</span>
                          <span className="font-mono font-bold">{activeTrace.warpBeam.total_ends} ends</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Warped Length:</span>
                          <span className="font-mono">{activeTrace.warpBeam.beam_length} m</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                          <span className="text-slate-400">YARN_LOT #{activeTrace.warpYarnLot.lot_id}:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {activeTrace.warpYarnLot.yarn_count}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Supplier: {activeTrace.warpYarnLot.supplier}</span>
                          <span>Received: {activeTrace.warpYarnLot.received_date}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weft Stream */}
                  <div className={`p-4 rounded-xl border border-orange-500/30 ${cardBg} space-y-3`}>
                    <div className="flex items-center justify-between text-orange-500">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        Weft Lineage (WEFT_PACKAGE #{activeTrace.weftPackage.package_id})
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-orange-500/10 text-orange-900 dark:text-orange-300">
                        <span className="font-semibold block">Weft Count:</span>
                        <span className="font-mono font-bold">{activeTrace.weftPackage.count}</span>
                      </div>

                      <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/40 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">From YARN_LOT:</span>
                          <span className="font-mono font-bold">Lot #{activeTrace.weftYarnLot.lot_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Yarn Count:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {activeTrace.weftYarnLot.yarn_count}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1">
                          <span className="text-slate-400">Supplier:</span>
                          <span className="font-semibold">{activeTrace.weftYarnLot.supplier}</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>Received: {activeTrace.weftYarnLot.received_date}</span>
                          <span>Status: In Weft Feeder</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                No matching genealogy trace found for &quot;{traceQuery}&quot;. Try searching for &quot;PO-TARGET-7741&quot; or &quot;601&quot;.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: APEX GRID / DATA EXPLORER */}
      {activeTab === "tables" && (
        <div className="space-y-6">
          <div className={`p-6 rounded-xl border ${cardBg} shadow-sm space-y-6`}>
            {/* Table Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {(Object.keys(ERD_METAS) as ErdTableKey[]).map((tbl) => {
                const isSelected = selectedTable === tbl;
                const meta = ERD_METAS[tbl];
                const count =
                  tbl === "YARN_LOT"
                    ? erdData?.yarnLots?.length ?? 0
                    : tbl === "WARP_BEAM"
                    ? erdData?.warpBeams?.length ?? 0
                    : tbl === "SIZED_BEAM"
                    ? erdData?.sizedBeams?.length ?? 0
                    : tbl === "WEFT_PACKAGE"
                    ? erdData?.weftPackages?.length ?? 0
                    : tbl === "LOOM"
                    ? erdData?.looms?.length ?? 0
                    : tbl === "LOOM_JOB"
                    ? erdData?.loomJobs?.length ?? 0
                    : tbl === "FABRIC_ROLL"
                    ? erdData?.fabricRolls?.length ?? 0
                    : tbl === "INSPECTION"
                    ? erdData?.inspections?.length ?? 0
                    : tbl === "MENDING"
                    ? erdData?.mendings?.length ?? 0
                    : erdData?.packedLots?.length ?? 0;

                return (
                  <button
                    key={tbl}
                    onClick={() => {
                      setSelectedTable(tbl);
                      setTableSearch("");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{meta.title}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isSelected ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative flex-1 w-full sm:max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder={`Search ${selectedTable}...`}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal(selectedTable)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add {selectedTable} Record
                </button>
              </div>
            </div>

            {/* APEX Data Grid */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className={`${headerBg} text-slate-600 dark:text-slate-400 uppercase font-semibold border-b border-slate-200 dark:border-slate-800`}>
                  <tr>
                    {filteredRows.length > 0 &&
                      Object.keys(filteredRows[0]).map((col) => (
                        <th key={col} className="px-4 py-2.5 font-mono">
                          {col}
                        </th>
                      ))}
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {filteredRows.map((row: any, idx: number) => {
                    const pkVal = Object.values(row)[0];
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        {Object.entries(row).map(([k, val]: [string, any], cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {k === "status" ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  val === "RUNNING" || val === "REPAIRED"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : val === "PENDING" || val === "SETUP"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-slate-500/10 text-slate-500"
                                }`}
                              >
                                {String(val)}
                              </span>
                            ) : k === "grade" ? (
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  val === "Grade A"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : val === "Grade B"
                                    ? "bg-amber-500/10 text-amber-500"
                                    : "bg-rose-500/10 text-rose-500"
                                }`}
                              >
                                {String(val)}
                              </span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          {selectedTable === "LOOM_JOB" && (
                            <button
                              onClick={async () => {
                                const nextStatus = row.status === "RUNNING" ? "COMPLETED" : "RUNNING";
                                await updateLoomJobStatusInDb(row.job_id, nextStatus);
                                loadErdData();
                              }}
                              className="px-2 py-1 rounded text-[10px] font-sans font-medium bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 border border-slate-200 dark:border-slate-700"
                            >
                              Toggle Status
                            </button>
                          )}

                          {selectedTable === "MENDING" && (
                            <button
                              onClick={async () => {
                                const nextStatus = row.status === "REPAIRED" ? "PENDING" : "REPAIRED";
                                await updateMendingStatusInDb(row.mending_id, nextStatus);
                                loadErdData();
                              }}
                              className="px-2 py-1 rounded text-[10px] font-sans font-medium bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 border border-slate-200 dark:border-slate-700"
                            >
                              Mark {row.status === "REPAIRED" ? "Pending" : "Repaired"}
                            </button>
                          )}

                          {selectedTable === "FABRIC_ROLL" && (
                            <button
                              onClick={() => {
                                setTraceQuery(String(row.roll_id));
                                setActiveTab("trace");
                                handleRunTrace(String(row.roll_id));
                              }}
                              className="px-2 py-1 rounded text-[10px] font-sans font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800"
                            >
                              View Pedigree
                            </button>
                          )}

                          {selectedTable !== "LOOM_JOB" && selectedTable !== "MENDING" && selectedTable !== "FABRIC_ROLL" && (
                            <span className="text-[11px] text-slate-400">ID: {String(pkVal)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROCESS OPERATIONS HUB */}
      {activeTab === "operations" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1: Yarn & Preparation */}
          <div className={`p-5 rounded-xl border ${cardBg} shadow-sm space-y-4`}>
            <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs">1</span>
              <span>Yarn & Preparation</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Receive raw yarn lots, warp beams, chemical sizing, and winding weft packages.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveModal("YARN_LOT")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Receive Yarn Lot</span>
                <Plus className="w-3.5 h-3.5 text-amber-500" />
              </button>

              <button
                onClick={() => setActiveModal("WARP_BEAM")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Warp Beam from Lot</span>
                <Plus className="w-3.5 h-3.5 text-blue-500" />
              </button>

              <button
                onClick={() => setActiveModal("SIZED_BEAM")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-cyan-50 dark:hover:bg-cyan-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Size Warp Beam</span>
                <Plus className="w-3.5 h-3.5 text-cyan-500" />
              </button>

              <button
                onClick={() => setActiveModal("WEFT_PACKAGE")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-orange-50 dark:hover:bg-orange-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Wind Weft Package</span>
                <Plus className="w-3.5 h-3.5 text-orange-500" />
              </button>
            </div>
          </div>

          {/* Step 2: Weaving Shed Execution */}
          <div className={`p-5 rounded-xl border ${cardBg} shadow-sm space-y-4`}>
            <div className="flex items-center gap-2 text-indigo-500 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs">2</span>
              <span>Weaving Shed</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mount sized warp beam & weft package to loom, launch weaving jobs, and doff fabric rolls.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveModal("LOOM_JOB")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Launch New Loom Job</span>
                <Plus className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              <button
                onClick={() => setActiveModal("FABRIC_ROLL")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-violet-50 dark:hover:bg-violet-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Doff Fabric Roll</span>
                <Scissors className="w-3.5 h-3.5 text-violet-500" />
              </button>
            </div>
          </div>

          {/* Step 3: Quality & Mending */}
          <div className={`p-5 rounded-xl border ${cardBg} shadow-sm space-y-4`}>
            <div className="flex items-center gap-2 text-pink-500 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs">3</span>
              <span>Quality & Mending</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Log 4-point perch inspection scores, assign Grade A/B/C, and dispatch burling & mending repairs.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveModal("INSPECTION")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-pink-50 dark:hover:bg-pink-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Log Roll Inspection</span>
                <FileCheck className="w-3.5 h-3.5 text-pink-500" />
              </button>

              <button
                onClick={() => setActiveModal("MENDING")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Open Mending Ticket</span>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              </button>
            </div>
          </div>

          {/* Step 4: Packing & Dispatch */}
          <div className={`p-5 rounded-xl border ${cardBg} shadow-sm space-y-4`}>
            <div className="flex items-center gap-2 text-teal-500 font-bold text-sm">
              <span className="w-5 h-5 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs">4</span>
              <span>Packing & Dispatch</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Package inspected fabric rolls into Customer PO container lots and schedule commercial dispatch.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setActiveModal("PACKED_LOT")}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-teal-50 dark:hover:bg-teal-950/20 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Pack into Customer PO</span>
                <Truck className="w-3.5 h-3.5 text-teal-500" />
              </button>

              <button
                onClick={() => {
                  setActiveTab("trace");
                  setTraceQuery("PO-TARGET-7741");
                  handleRunTrace("PO-TARGET-7741");
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <span>Trace Dispatch Lot</span>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODALS */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-xl border ${cardBg} p-6 shadow-xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base">New {activeModal} Record</h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {activeModal === "YARN_LOT" && (
              <form onSubmit={handleCreateYarnLot} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Yarn Count Specification</label>
                  <input
                    type="text"
                    required
                    value={newYarnLot.yarn_count}
                    onChange={(e) => setNewYarnLot({ ...newYarnLot, yarn_count: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Supplier / Spinning Mill</label>
                  <input
                    type="text"
                    required
                    value={newYarnLot.supplier}
                    onChange={(e) => setNewYarnLot({ ...newYarnLot, supplier: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Received Date</label>
                  <input
                    type="date"
                    required
                    value={newYarnLot.received_date}
                    onChange={(e) => setNewYarnLot({ ...newYarnLot, received_date: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Save Yarn Lot
                  </button>
                </div>
              </form>
            )}

            {activeModal === "WARP_BEAM" && (
              <form onSubmit={handleCreateWarpBeam} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Source YARN_LOT (FK)</label>
                  <select
                    value={newWarpBeam.lot_id}
                    onChange={(e) => setNewWarpBeam({ ...newWarpBeam, lot_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.yarnLots?.map((y) => (
                      <option key={y.lot_id} value={y.lot_id}>
                        Lot #{y.lot_id} - {y.yarn_count} ({y.supplier})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Total Ends</label>
                  <input
                    type="number"
                    required
                    value={newWarpBeam.total_ends}
                    onChange={(e) => setNewWarpBeam({ ...newWarpBeam, total_ends: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Beam Length (meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newWarpBeam.beam_length}
                    onChange={(e) => setNewWarpBeam({ ...newWarpBeam, beam_length: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Save Warp Beam
                  </button>
                </div>
              </form>
            )}

            {activeModal === "SIZED_BEAM" && (
              <form onSubmit={handleCreateSizedBeam} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Source WARP_BEAM (FK)</label>
                  <select
                    value={newSizedBeam.beam_id}
                    onChange={(e) => setNewSizedBeam({ ...newSizedBeam, beam_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.warpBeams?.map((b) => (
                      <option key={b.beam_id} value={b.beam_id}>
                        Beam #{b.beam_id} - {b.total_ends} ends ({b.beam_length}m)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Chemical Sizing Recipe</label>
                  <input
                    type="text"
                    required
                    value={newSizedBeam.size_recipe}
                    onChange={(e) => setNewSizedBeam({ ...newSizedBeam, size_recipe: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Sizing Date</label>
                  <input
                    type="date"
                    required
                    value={newSizedBeam.sizing_date}
                    onChange={(e) => setNewSizedBeam({ ...newSizedBeam, sizing_date: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Save Sized Beam
                  </button>
                </div>
              </form>
            )}

            {activeModal === "WEFT_PACKAGE" && (
              <form onSubmit={handleCreateWeftPackage} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Source YARN_LOT (FK)</label>
                  <select
                    value={newWeftPackage.lot_id}
                    onChange={(e) => setNewWeftPackage({ ...newWeftPackage, lot_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.yarnLots?.map((y) => (
                      <option key={y.lot_id} value={y.lot_id}>
                        Lot #{y.lot_id} - {y.yarn_count}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Weft Count</label>
                  <input
                    type="text"
                    required
                    value={newWeftPackage.count}
                    onChange={(e) => setNewWeftPackage({ ...newWeftPackage, count: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Save Weft Package
                  </button>
                </div>
              </form>
            )}

            {activeModal === "LOOM_JOB" && (
              <form onSubmit={handleCreateLoomJob} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Target LOOM (FK)</label>
                  <select
                    value={newLoomJob.loom_id}
                    onChange={(e) => setNewLoomJob({ ...newLoomJob, loom_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.looms?.map((l) => (
                      <option key={l.loom_id} value={l.loom_id}>
                        Loom #{l.loom_id} ({l.loom_type} - {l.reed_width}cm)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Mounted SIZED_BEAM (FK)</label>
                  <select
                    value={newLoomJob.sized_beam_id}
                    onChange={(e) => setNewLoomJob({ ...newLoomJob, sized_beam_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.sizedBeams?.map((sb) => (
                      <option key={sb.sized_beam_id} value={sb.sized_beam_id}>
                        Sized Beam #{sb.sized_beam_id} ({sb.size_recipe.slice(0, 30)}...)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Supplied WEFT_PACKAGE (FK)</label>
                  <select
                    value={newLoomJob.package_id}
                    onChange={(e) => setNewLoomJob({ ...newLoomJob, package_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.weftPackages?.map((wp) => (
                      <option key={wp.package_id} value={wp.package_id}>
                        Package #{wp.package_id} ({wp.count})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Article No</label>
                  <input
                    type="text"
                    required
                    value={newLoomJob.article_no}
                    onChange={(e) => setNewLoomJob({ ...newLoomJob, article_no: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Launch Loom Job
                  </button>
                </div>
              </form>
            )}

            {activeModal === "FABRIC_ROLL" && (
              <form onSubmit={handleCreateFabricRoll} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Producing LOOM_JOB (FK)</label>
                  <select
                    value={newFabricRoll.job_id}
                    onChange={(e) => setNewFabricRoll({ ...newFabricRoll, job_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.loomJobs?.map((j) => (
                      <option key={j.job_id} value={j.job_id}>
                        Job #{j.job_id} - {j.article_no} (Loom #{j.loom_id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Roll Length (meters)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newFabricRoll.length_mtrs}
                    onChange={(e) => setNewFabricRoll({ ...newFabricRoll, length_mtrs: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Doff Fabric Roll
                  </button>
                </div>
              </form>
            )}

            {activeModal === "INSPECTION" && (
              <form onSubmit={handleCreateInspection} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Inspected FABRIC_ROLL (FK)</label>
                  <select
                    value={newInspection.roll_id}
                    onChange={(e) => setNewInspection({ ...newInspection, roll_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.fabricRolls?.map((r) => (
                      <option key={r.roll_id} value={r.roll_id}>
                        Roll #{r.roll_id} ({r.length_mtrs}m - {r.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Defect Points (4-point system)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newInspection.defect_points}
                    onChange={(e) => setNewInspection({ ...newInspection, defect_points: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">
                    &le;20 = Grade A, &le;35 = Grade B, &gt;35 = Grade C
                  </span>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Inspector Auditor</label>
                  <input
                    type="text"
                    required
                    value={newInspection.inspector}
                    onChange={(e) => setNewInspection({ ...newInspection, inspector: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Record Inspection
                  </button>
                </div>
              </form>
            )}

            {activeModal === "MENDING" && (
              <form onSubmit={handleCreateMending} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Parent INSPECTION (FK)</label>
                  <select
                    value={newMending.inspection_id}
                    onChange={(e) => setNewMending({ ...newMending, inspection_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.inspections?.map((ins) => (
                      <option key={ins.inspection_id} value={ins.inspection_id}>
                        Inspection #{ins.inspection_id} for Roll #{ins.roll_id} ({ins.defect_points} pts)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Defect Type & Meter Position</label>
                  <input
                    type="text"
                    required
                    value={newMending.defect_type}
                    onChange={(e) => setNewMending({ ...newMending, defect_type: e.target.value })}
                    placeholder="e.g. Broken Pick at 44m, Warp Float"
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Create Mending Ticket
                  </button>
                </div>
              </form>
            )}

            {activeModal === "PACKED_LOT" && (
              <form onSubmit={handleCreatePackedLot} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1">Inspected FABRIC_ROLL (FK)</label>
                  <select
                    value={newPackedLot.roll_id}
                    onChange={(e) => setNewPackedLot({ ...newPackedLot, roll_id: Number(e.target.value) })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    {erdData?.fabricRolls?.map((r) => (
                      <option key={r.roll_id} value={r.roll_id}>
                        Roll #{r.roll_id} ({r.length_mtrs}m - {r.grade})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Customer PO Number</label>
                  <input
                    type="text"
                    required
                    value={newPackedLot.customer_po}
                    onChange={(e) => setNewPackedLot({ ...newPackedLot, customer_po: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1">Dispatch Date</label>
                  <input
                    type="date"
                    required
                    value={newPackedLot.dispatch_date}
                    onChange={(e) => setNewPackedLot({ ...newPackedLot, dispatch_date: e.target.value })}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 rounded border border-slate-300 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 rounded bg-indigo-600 text-white font-medium">
                    Pack & Schedule Dispatch
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

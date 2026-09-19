import React, { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  Filter,
  ArrowUpDown,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Eye,
  CheckSquare,
  Square,
  Wrench,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { LoomTelemetry, LoomStatus, ApexTheme } from "../types";

interface LoomGridPageProps {
  looms: LoomTelemetry[];
  onUpdateLoom: (id: string, partial: Partial<LoomTelemetry>) => void;
  onOpenLoomDetail: (loom: LoomTelemetry) => void;
  theme: ApexTheme;
}

type SortField = "id" | "name" | "shed" | "type" | "status" | "rpm" | "oee" | "totalMetersShift" | "warpStopsCount" | "beamMetersRemaining";

export const LoomGridPage: React.FC<LoomGridPageProps> = ({
  looms,
  onUpdateLoom,
  onOpenLoomDetail,
  theme,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [shedFilter, setShedFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showAddLoomModal, setShowAddLoomModal] = useState(false);

  // New Loom Form State
  const [newLoomId, setNewLoomId] = useState(`LM-${looms.length + 101}`);
  const [newLoomName, setNewLoomName] = useState("Loom 305 (Rapier-New)");
  const [newLoomShed, setNewLoomShed] = useState<LoomTelemetry["shed"]>("Shed C (Technical Weaves)");
  const [newLoomModel, setNewLoomModel] = useState("Dornier P2 Rapier System");
  const [newLoomType, setNewLoomType] = useState<LoomTelemetry["type"]>("Rapier");
  const [newLoomTargetRpm, setNewLoomTargetRpm] = useState(650);

  // Filter & Sort logic
  const filtered = looms.filter((l) => {
    const matchesSearch =
      l.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.currentPatternName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.operatorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || l.status === statusFilter;
    const matchesType = typeFilter === "ALL" || l.type === typeFilter;
    const matchesShed = shedFilter === "ALL" || l.shed.includes(shedFilter);

    return matchesSearch && matchesStatus && matchesType && matchesShed;
  });

  const sorted = [...filtered].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map((l) => l.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchStatus = (newStatus: LoomStatus) => {
    selectedIds.forEach((id) => {
      const loom = looms.find((l) => l.id === id);
      if (loom) {
        onUpdateLoom(id, {
          status: newStatus,
          rpm: newStatus === "RUNNING" ? loom.targetRpm : 0,
        });
      }
    });
    setSelectedIds([]);
  };

  const exportToCsv = () => {
    const headers = [
      "Loom ID",
      "Model",
      "Shed",
      "Type",
      "Status",
      "RPM",
      "OEE %",
      "Current Pattern",
      "Shift Meters",
      "Picks Count",
      "Warp Stops",
      "Weft Stops",
      "Beam Left (m)",
      "Operator",
    ];

    const rows = sorted.map((l) => [
      l.id,
      l.model,
      l.shed,
      l.type,
      l.status,
      l.rpm,
      l.oee,
      `"${l.currentPatternName}"`,
      l.totalMetersShift,
      l.totalPicksShift,
      l.warpStopsCount,
      l.weftStopsCount,
      l.beamMetersRemaining,
      `"${l.operatorName}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `apex_loom_productivity_grid_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aggregates for IG footer
  const totalMeters = sorted.reduce((sum, l) => sum + l.totalMetersShift, 0);
  const totalPicks = sorted.reduce((sum, l) => sum + l.totalPicksShift, 0);
  const avgOee = sorted.length ? sorted.reduce((sum, l) => sum + l.oee, 0) / sorted.length : 0;
  const avgRpm = sorted.length ? sorted.reduce((sum, l) => sum + l.rpm, 0) / sorted.length : 0;
  const totalWarpStops = sorted.reduce((sum, l) => sum + l.warpStopsCount, 0);
  const totalWeftStops = sorted.reduce((sum, l) => sum + l.weftStopsCount, 0);

  return (
    <div className="space-y-4">
      {/* Header & APEX Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Home</span>
            <span>/</span>
            <span>Productivity & Telemetry</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Page 10: Interactive Grid (IG_LOOMS)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Loom Fleet Productivity & OEE Grid
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <div className="flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-300 font-mono">{selectedIds.length} Selected:</span>
              <button
                onClick={() => handleBatchStatus("RUNNING")}
                className="px-1.5 py-0.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                Run All
              </button>
              <button
                onClick={() => handleBatchStatus("IDLE")}
                className="px-1.5 py-0.5 rounded bg-slate-700 text-white font-medium hover:bg-slate-800"
              >
                Standby All
              </button>
            </div>
          )}

          <button
            onClick={exportToCsv}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddLoomModal(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register New Loom</span>
          </button>
        </div>
      </div>

      {/* APEX Interactive Grid Toolbar */}
      <div className="bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search in grid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-3 py-1.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("ALL");
              setTypeFilter("ALL");
              setShedFilter("ALL");
            }}
            className="px-2 py-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded font-medium"
            title="Reset Filters"
          >
            Reset
          </button>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded">
            <span className="text-slate-400 font-mono text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="RUNNING">Running</option>
              <option value="STOPPED_WARP">Warp Break</option>
              <option value="STOPPED_WEFT">Weft Stop</option>
              <option value="BEAM_OUT">Beam Out</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="IDLE">Idle</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded">
            <span className="text-slate-400 font-mono text-[11px]">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by Type"
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Loom Types</option>
              <option value="Air Jet">Air Jet</option>
              <option value="Rapier">Rapier</option>
              <option value="Jacquard Electronic">Jacquard Electronic</option>
              <option value="Dobby High-Speed">Dobby High-Speed</option>
            </select>
          </div>

          {/* Shed Filter */}
          <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded">
            <span className="text-slate-400 font-mono text-[11px]">Shed:</span>
            <select
              value={shedFilter}
              onChange={(e) => setShedFilter(e.target.value)}
              aria-label="Filter by Shed"
              className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sheds</option>
              <option value="Shed A">Shed A</option>
              <option value="Shed B">Shed B</option>
              <option value="Shed C">Shed C</option>
            </select>
          </div>
        </div>
      </div>

      {/* APEX Interactive Grid Table Container */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto bg-white dark:bg-slate-900 shadow-xs">
        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 select-none font-semibold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-3 w-8 text-center">
                <button onClick={toggleSelectAll} className="cursor-pointer text-slate-400 hover:text-slate-600">
                  {selectedIds.length === sorted.length && sorted.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("id")}>
                <div className="flex items-center space-x-1">
                  <span>Loom ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("status")}>
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("shed")}>
                <div className="flex items-center space-x-1">
                  <span>Shed / Hall</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("rpm")}>
                <div className="flex items-center space-x-1">
                  <span>Current RPM</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("oee")}>
                <div className="flex items-center space-x-1">
                  <span>OEE %</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3">Current Pattern Assigned</th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("totalMetersShift")}>
                <div className="flex items-center space-x-1">
                  <span>Shift Output (m)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("warpStopsCount")}>
                <div className="flex items-center space-x-1">
                  <span>Warp Stops</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => handleSort("beamMetersRemaining")}>
                <div className="flex items-center space-x-1">
                  <span>Beam Left (m)</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="p-3">Operator</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
            {sorted.map((loom) => {
              const isSelected = selectedIds.includes(loom.id);
              const isRunning = loom.status === "RUNNING";

              return (
                <tr
                  key={loom.id}
                  className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                    isSelected ? "bg-blue-50/60 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <td className="p-3 text-center">
                    <button onClick={() => toggleSelectOne(loom.id)} className="cursor-pointer">
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </td>

                  <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <span>{loom.id}</span>
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        loom.status === "RUNNING"
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : loom.status === "STOPPED_WARP"
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : loom.status === "STOPPED_WEFT"
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : loom.status === "BEAM_OUT"
                          ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                      }`}
                    >
                      {loom.status}
                    </span>
                  </td>

                  <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{loom.shed}</td>

                  <td className="p-3">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{loom.rpm}</span>
                    <span className="text-slate-400 text-[10px]"> / {loom.targetRpm}</span>
                  </td>

                  <td className="p-3 font-bold">
                    <span
                      className={
                        loom.oee >= 90
                          ? "text-emerald-600 dark:text-emerald-400"
                          : loom.oee >= 80
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-rose-600 dark:text-rose-400"
                      }
                    >
                      {loom.oee.toFixed(1)}%
                    </span>
                  </td>

                  <td className="p-3 font-sans max-w-[180px] truncate text-slate-800 dark:text-slate-200" title={loom.currentPatternName}>
                    {loom.currentPatternName}
                  </td>

                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    {loom.totalMetersShift.toLocaleString()} m
                  </td>

                  <td className="p-3">
                    <span className={loom.warpStopsCount > 3 ? "text-rose-500 font-bold" : "text-slate-600 dark:text-slate-400"}>
                      {loom.warpStopsCount}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={loom.beamMetersRemaining < 100 ? "text-rose-500 font-bold" : "text-slate-800 dark:text-slate-200"}>
                      {loom.beamMetersRemaining.toLocaleString()}m
                    </span>
                  </td>

                  <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{loom.operatorName}</td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      {/* Run / Stop toggle */}
                      <button
                        onClick={() => {
                          if (isRunning) {
                            onUpdateLoom(loom.id, { status: "IDLE", rpm: 0 });
                          } else {
                            onUpdateLoom(loom.id, { status: "RUNNING", rpm: loom.targetRpm });
                          }
                        }}
                        className={`p-1 rounded transition-colors ${
                          isRunning
                            ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                        title={isRunning ? "Standby" : "Engage"}
                      >
                        {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </button>

                      {/* Speed Override (+/- 25 RPM) */}
                      <button
                        onClick={() => onUpdateLoom(loom.id, { rpm: Math.min(loom.targetRpm + 50, loom.rpm + 25) })}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                        title="Increase RPM by 25"
                      >
                        +25
                      </button>

                      <button
                        onClick={() => onUpdateLoom(loom.id, { rpm: Math.max(0, loom.rpm - 25) })}
                        className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px]"
                        title="Decrease RPM by 25"
                      >
                        -25
                      </button>

                      {/* Detail modal button */}
                      <button
                        onClick={() => onOpenLoomDetail(loom)}
                        className="p-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100"
                        title="View Loom Telemetry Diagnostic"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* APEX Interactive Grid Aggregate Footer */}
          <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-mono font-bold text-xs text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
            <tr>
              <td className="p-3 text-center">Σ</td>
              <td className="p-3 font-sans">Filtered Fleet Total ({sorted.length})</td>
              <td className="p-3">
                {sorted.filter((l) => l.status === "RUNNING").length} Running
              </td>
              <td className="p-3">-</td>
              <td className="p-3">{avgRpm.toFixed(0)} avg RPM</td>
              <td className="p-3 text-emerald-600 dark:text-emerald-400">{avgOee.toFixed(1)}% avg OEE</td>
              <td className="p-3">-</td>
              <td className="p-3 text-blue-600 dark:text-blue-400">{totalMeters.toLocaleString()} m</td>
              <td className="p-3">{totalWarpStops} Stops</td>
              <td className="p-3">-</td>
              <td className="p-3 font-sans">Full Shed Coverage</td>
              <td className="p-3 text-right text-slate-500 font-sans text-[10px]">APEX IG Computed</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Register New Loom Modal */}
      {showAddLoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-md w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Register New Weaving Machine (APEX Form)
              </h3>
              <button
                onClick={() => setShowAddLoomModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Loom Identifier (ID)</label>
                <input
                  type="text"
                  value={newLoomId}
                  onChange={(e) => setNewLoomId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Machine Name / Description</label>
                <input
                  type="text"
                  value={newLoomName}
                  onChange={(e) => setNewLoomName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Shed Location</label>
                  <select
                    value={newLoomShed}
                    onChange={(e) => setNewLoomShed(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="Shed A (High-Speed)">Shed A (High-Speed)</option>
                    <option value="Shed B (Jacquard Fine)">Shed B (Jacquard Fine)</option>
                    <option value="Shed C (Technical Weaves)">Shed C (Technical Weaves)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Loom Mechanism</label>
                  <select
                    value={newLoomType}
                    onChange={(e) => setNewLoomType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1.5 text-slate-900 dark:text-white"
                  >
                    <option value="Air Jet">Air Jet</option>
                    <option value="Rapier">Rapier</option>
                    <option value="Jacquard Electronic">Jacquard Electronic</option>
                    <option value="Dobby High-Speed">Dobby High-Speed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Target Speed (Picks/Min)</label>
                <input
                  type="number"
                  value={newLoomTargetRpm}
                  onChange={(e) => setNewLoomTargetRpm(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowAddLoomModal(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newLoom: LoomTelemetry = {
                    id: newLoomId,
                    name: newLoomName,
                    shed: newLoomShed,
                    model: newLoomModel,
                    type: newLoomType,
                    status: "RUNNING",
                    rpm: newLoomTargetRpm,
                    targetRpm: newLoomTargetRpm,
                    oee: 92.0,
                    efficiency: 94.0,
                    currentPatternId: "PAT-TWL-201",
                    currentPatternName: "Structured Denim Twill 3/1",
                    warpLotId: "LOT-CT-301",
                    weftLotId: "LOT-CT-302",
                    totalPicksShift: 0,
                    totalMetersShift: 0,
                    picksPerCm: 30,
                    warpStopsCount: 0,
                    weftStopsCount: 0,
                    warpTension: 35,
                    weftTension: 30,
                    beamMetersRemaining: 3000,
                    beamTotalMeters: 3000,
                    operatorName: "Vikram Mehta",
                  };
                  looms.push(newLoom);
                  setShowAddLoomModal(false);
                }}
                className="px-4 py-1.5 rounded text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
              >
                Save & Initialize Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

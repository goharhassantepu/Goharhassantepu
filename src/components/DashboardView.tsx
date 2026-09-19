import React, { useState } from "react";
import {
  Activity,
  Gauge,
  Layers,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Wrench,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  ChevronRight,
  Plus,
} from "lucide-react";
import { LoomTelemetry, LoomStatus, ThreadLot, WarpBeam, DowntimeEvent, ApexTheme } from "../types";

interface DashboardViewProps {
  looms: LoomTelemetry[];
  onUpdateLoom: (id: string, partial: Partial<LoomTelemetry>) => void;
  threadLots: ThreadLot[];
  warpBeams: WarpBeam[];
  downtimeLogs: DowntimeEvent[];
  onAcknowledgeDowntime: (id: string) => void;
  onOpenLoomDetail: (loom: LoomTelemetry) => void;
  onNavigatePage: (pageId: number) => void;
  onInjectTestBreak: () => void;
  theme: ApexTheme;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  looms,
  onUpdateLoom,
  threadLots,
  warpBeams,
  downtimeLogs,
  onAcknowledgeDowntime,
  onOpenLoomDetail,
  onNavigatePage,
  onInjectTestBreak,
  theme,
}) => {
  const [selectedShedFilter, setSelectedShedFilter] = useState<string>("ALL");

  const filteredLooms = looms.filter((l) => {
    if (selectedShedFilter === "ALL") return true;
    if (selectedShedFilter === "SHED_A") return l.shed.includes("Shed A");
    if (selectedShedFilter === "SHED_B") return l.shed.includes("Shed B");
    if (selectedShedFilter === "SHED_C") return l.shed.includes("Shed C");
    return true;
  });

  // KPI Calculations
  const runningCount = looms.filter((l) => l.status === "RUNNING").length;
  const stoppedCount = looms.filter((l) => l.status !== "RUNNING" && l.status !== "MAINTENANCE").length;
  const totalMeters = looms.reduce((acc, l) => acc + l.totalMetersShift, 0);
  const totalPicks = looms.reduce((acc, l) => acc + l.totalPicksShift, 0);
  const avgOee = looms.length ? looms.reduce((acc, l) => acc + l.oee, 0) / looms.length : 0;
  const lowStockCount = threadLots.filter((t) => t.currentStockKg <= t.minThresholdKg).length;
  const criticalBeams = warpBeams.filter((b) => b.remainingLengthMeters <= 100);

  const getStatusBadge = (status: LoomStatus) => {
    switch (status) {
      case "RUNNING":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Running
          </span>
        );
      case "STOPPED_WARP":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            Warp Break
          </span>
        );
      case "STOPPED_WEFT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Weft Stop
          </span>
        );
      case "BEAM_OUT":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5" />
            Beam Out
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
            Maintenance
          </span>
        );
      case "IDLE":
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 border border-slate-500/20">
            Idle
          </span>
        );
    }
  };

  const handleToggleLoomState = (loom: LoomTelemetry) => {
    if (loom.status === "RUNNING") {
      onUpdateLoom(loom.id, {
        status: "IDLE",
        rpm: 0,
        lastStopReason: "Manual operator standby",
      });
    } else {
      onUpdateLoom(loom.id, {
        status: "RUNNING",
        rpm: loom.targetRpm,
        lastStopReason: undefined,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* APEX Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Home</span>
            <span>/</span>
            <span>Weaving Production</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Page 1: Real-Time Floor Telemetry</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Weaving Shed Telemetry & Machine OEE
          </h1>
        </div>

        {/* Quick Operations Actions */}
        <div className="flex items-center space-x-2">
          <button
            id="inject-warp-break-btn"
            onClick={onInjectTestBreak}
            className="px-2.5 py-1.5 text-xs font-semibold rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex items-center space-x-1.5"
            title="Simulate random yarn break fault to test operator alerting"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Simulate Sensor Break</span>
          </button>

          <button
            id="apex-open-report-btn"
            onClick={() => onNavigatePage(40)}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Shift Handover Report</span>
          </button>
        </div>
      </div>

      {/* APEX KPI Metric Cards Region */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Fleet OEE */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Overall Equipment Eff. (OEE)
            </span>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {avgOee.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-0.5">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              <span>+2.3% vs Target (90.0%)</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(avgOee, 100)}%` }} />
          </div>
        </div>

        {/* Metric 2: Shift Production Output */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Shift Output (Meters)
            </span>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalMeters.toLocaleString()} m
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center mt-0.5">
              <span>{totalPicks.toLocaleString()} Picks inserted</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Shift Run Pace:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">1,480 m/hr</span>
          </div>
        </div>

        {/* Metric 3: Machine Fleet Status */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Fleet Operational Status
            </span>
            <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{runningCount}</span>
              <span className="text-slate-400 font-mono">/ {looms.length} Looms Active</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 mt-0.5">
              <span className="text-rose-500 font-medium">{stoppedCount} Stoppages</span>
              <span>•</span>
              <span className="text-slate-400">1 Scheduled Maint</span>
            </div>
          </div>
          <div className="flex items-center space-x-1 pt-1">
            {looms.map((l) => (
              <span
                key={l.id}
                className={`h-2 flex-1 rounded-sm ${
                  l.status === "RUNNING"
                    ? "bg-emerald-500"
                    : l.status === "MAINTENANCE"
                    ? "bg-slate-400"
                    : "bg-rose-500"
                }`}
                title={`${l.id}: ${l.status}`}
              />
            ))}
          </div>
        </div>

        {/* Metric 4: Thread & Warp Beam Health */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
              Yarn & Beam Depletion
            </span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{criticalBeams.length}</span>
              <span className="text-xs font-normal text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded font-sans">
                Beam Exhausted
              </span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>{lowStockCount} Yarn Lots below safety threshold</span>
            </div>
          </div>
          <button
            onClick={() => onNavigatePage(20)}
            className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800"
          >
            <span>Review Warp & Weft Lot Queue</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* APEX Faceted Shed Selector & Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-1">
          <button
            id="shed-filter-all"
            onClick={() => setSelectedShedFilter("ALL")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedShedFilter === "ALL"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            All Sheds ({looms.length})
          </button>
          <button
            id="shed-filter-a"
            onClick={() => setSelectedShedFilter("SHED_A")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedShedFilter === "SHED_A"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Shed A: High-Speed Airjet (4)
          </button>
          <button
            id="shed-filter-b"
            onClick={() => setSelectedShedFilter("SHED_B")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedShedFilter === "SHED_B"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Shed B: Jacquard & Dobby (4)
          </button>
          <button
            id="shed-filter-c"
            onClick={() => setSelectedShedFilter("SHED_C")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              selectedShedFilter === "SHED_C"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Shed C: Technical & Rapier (4)
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden md:block px-2">
          Telemetry Update Rate: <span className="font-semibold text-emerald-600 dark:text-emerald-400">2.0s</span>
        </div>
      </div>

      {/* Main Weaving Shed Machine Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredLooms.map((loom) => {
          const isRunning = loom.status === "RUNNING";
          const beamPercent = Math.round((loom.beamMetersRemaining / loom.beamTotalMeters) * 100);

          return (
            <div
              key={loom.id}
              id={`loom-card-${loom.id}`}
              className={`bg-white dark:bg-slate-900 rounded-lg border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                isRunning
                  ? "border-slate-200 dark:border-slate-800"
                  : loom.status === "STOPPED_WARP" || loom.status === "STOPPED_WEFT"
                  ? "border-rose-300 dark:border-rose-900/60 bg-rose-500/[0.02]"
                  : loom.status === "BEAM_OUT"
                  ? "border-purple-300 dark:border-purple-900/60 bg-purple-500/[0.02]"
                  : "border-slate-200 dark:border-slate-800"
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                        {loom.id}
                      </span>
                      {getStatusBadge(loom.status)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      {loom.model}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-400">{loom.shed.split(" ")[0]}</div>
                    <div className="text-[11px] font-mono text-slate-500 font-medium">
                      OEE: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{loom.oee}%</span>
                    </div>
                  </div>
                </div>

                {/* Stoppage Reason banner if active */}
                {loom.lastStopReason && (
                  <div className="mt-2.5 p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{loom.lastStopReason}</span>
                  </div>
                )}
              </div>

              {/* Card Body: Live Metrics & Weaving Info */}
              <div className="p-4 space-y-3.5 text-xs">
                {/* Speed & Current Pattern */}
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span>Pattern Cycle</span>
                    <span className="font-mono text-slate-400">{loom.picksPerCm} Picks/cm</span>
                  </div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={loom.currentPatternName}>
                    {loom.currentPatternName}
                  </div>
                </div>

                {/* RPM & Speedometer */}
                <div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                    <span className="flex items-center">
                      <Gauge className="w-3 h-3 mr-1 text-slate-400" />
                      Insertion Speed (RPM)
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {loom.rpm} / {loom.targetRpm} Picks/min
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        loom.rpm > 0 ? "bg-blue-600" : "bg-slate-500"
                      }`}
                      style={{ width: `${(loom.rpm / loom.targetRpm) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Warp & Weft Tensions */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2 rounded border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400">Warp Tension</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {loom.warpTension} cN
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-slate-400">Weft Tension</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {loom.weftTension} cN
                    </div>
                  </div>
                </div>

                {/* Warp Beam Meters Remaining Progress */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    <span>Warp Beam Remaining</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {loom.beamMetersRemaining.toLocaleString()}m ({beamPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        beamPercent > 30 ? "bg-emerald-500" : beamPercent > 10 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${beamPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: Interactive Actions */}
              <div className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Op: <span className="font-medium text-slate-700 dark:text-slate-300">{loom.operatorName.split(" ")[0]}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleToggleLoomState(loom)}
                    className={`px-2 py-1 text-xs rounded font-medium flex items-center space-x-1 transition-colors ${
                      isRunning
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-700"
                    }`}
                    title={isRunning ? "Pause machine" : "Engage drive motor"}
                  >
                    {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isRunning ? "Standby" : "Engage"}</span>
                  </button>

                  <button
                    id={`open-detail-${loom.id}`}
                    onClick={() => onOpenLoomDetail(loom)}
                    className="px-2.5 py-1 text-xs rounded font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-1"
                  >
                    <span>Diagnostics</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time Weaving Floor Incidents & Stoppage Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Stoppages & Sensor Incident Queue
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400">
              {downtimeLogs.filter((d) => d.status === "ACTIVE").length} Unresolved
            </span>
          </div>

          <button
            onClick={() => onNavigatePage(40)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center"
          >
            <span>Full Shift Incident Pareto & Analysis</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {downtimeLogs.map((item) => (
            <div key={item.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {item.loomId}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                    item.type === "WARP"
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : item.type === "WEFT"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : item.type === "BEAM_CHANGE"
                      ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                      : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {item.type}
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">{item.reason}</span>
              </div>

              <div className="flex items-center space-x-3 font-mono">
                <span className="text-slate-400">{item.timestamp}</span>
                <span className="text-slate-500 font-semibold">{item.durationMinutes} min</span>
                {item.status === "ACTIVE" ? (
                  <button
                    onClick={() => onAcknowledgeDowntime(item.id)}
                    className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-medium hover:bg-emerald-700 flex items-center space-x-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{item.status}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

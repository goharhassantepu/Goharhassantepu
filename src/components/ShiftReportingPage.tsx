import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Activity,
  Layers,
  Calendar,
  MessageSquare,
  Cpu,
} from "lucide-react";
import {
  LoomTelemetry,
  ThreadLot,
  WarpBeam,
  DowntimeEvent,
  ShiftReportRecord,
  ApexTheme,
} from "../types";

interface ShiftReportingPageProps {
  looms: LoomTelemetry[];
  threadLots: ThreadLot[];
  warpBeams: WarpBeam[];
  downtimeLogs: DowntimeEvent[];
  shiftReports: ShiftReportRecord[];
  onAddShiftReport: (report: ShiftReportRecord) => void;
  activeShift: string;
  theme: ApexTheme;
}

export const ShiftReportingPage: React.FC<ShiftReportingPageProps> = ({
  looms,
  threadLots,
  warpBeams,
  downtimeLogs,
  shiftReports,
  onAddShiftReport,
  activeShift,
  theme,
}) => {
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState<string>("");
  const [reportSource, setReportSource] = useState<string | null>(null);
  const [reportSignoffStatus, setReportSignoffStatus] = useState<"Draft" | "Approved & Locked">("Draft");
  const [incomingManagerName, setIncomingManagerName] = useState<string>("Marcus Vance");
  const [activeTab, setActiveTab] = useState<"current" | "archive">("current");
  const [selectedArchiveReport, setSelectedArchiveReport] = useState<ShiftReportRecord | null>(null);

  // Aggregates for current shift
  const totalMeters = looms.reduce((sum, l) => sum + l.totalMetersShift, 0);
  const totalPicks = looms.reduce((sum, l) => sum + l.totalPicksShift, 0);
  const avgOee = looms.length ? looms.reduce((sum, l) => sum + l.oee, 0) / looms.length : 0;
  const warpStops = looms.reduce((sum, l) => sum + l.warpStopsCount, 0);
  const weftStops = looms.reduce((sum, l) => sum + l.weftStopsCount, 0);
  const lowLots = threadLots.filter((t) => t.currentStockKg <= t.minThresholdKg);
  const criticalBeams = warpBeams.filter((b) => b.remainingLengthMeters <= 100);

  // Lowest performing loom
  const lowestOeeLoom = [...looms].sort((a, b) => a.oee - b.oee)[0];
  const topOeeLoom = [...looms].sort((a, b) => b.oee - a.oee)[0];

  const handleGenerateAutomatedReport = async () => {
    setIsGeneratingAiReport(true);

    try {
      const payload = {
        shiftName: activeShift,
        shiftManager: "Elena Rostova",
        loomSummary: {
          totalLooms: looms.length,
          runningCount: looms.filter((l) => l.status === "RUNNING").length,
          stoppedCount: looms.filter((l) => l.status !== "RUNNING").length,
          totalMeters,
          totalPicks,
          avgEfficiency: avgOee.toFixed(1),
          topPerformer: `${topOeeLoom?.id} (${topOeeLoom?.oee}%)`,
          bottleneckLoom: `${lowestOeeLoom?.id} (${lowestOeeLoom?.oee}%)`,
        },
        downtimeEvents: downtimeLogs.slice(0, 5),
        threadAlerts: lowLots.map((l) => ({
          lot: l.lotNumber,
          yarn: l.yarnType,
          currentKg: l.currentStockKg,
          minKg: l.minThresholdKg,
          message: `${l.lotNumber} (${l.yarnType}) is at ${l.currentStockKg}kg (under ${l.minThresholdKg}kg safety threshold)`,
        })),
        patternCycles: looms.map((l) => ({
          loom: l.id,
          pattern: l.currentPatternName,
          beamLeft: `${l.beamMetersRemaining}m`,
        })),
      };

      const res = await fetch("/api/gemini/generate-shift-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setGeneratedReportText(data.report || "Report generated successfully.");
      if (data.source) {
        setReportSource(data.source);
      }
      setReportSignoffStatus("Draft");
    } catch (err) {
      console.warn("Shift report generator network fallback:", err);
      // Deterministic fallback
      setReportSource("apex-rule-engine");
      setGeneratedReportText(`### ORACLE APEX AUTOMATED SHIFT REPORT (${activeShift})
**Superintendent:** Elena Rostova | **Generated:** ${new Date().toLocaleString()}

1. **Executive OEE Overview:** Fleet achieved **${avgOee.toFixed(1)}% OEE**, weaving **${totalMeters.toLocaleString()}m** (${totalPicks.toLocaleString()} picks).
2. **Top Performer:** ${topOeeLoom?.id} at ${topOeeLoom?.oee}% OEE.
3. **Bottleneck Machine:** ${lowestOeeLoom?.id} (${lowestOeeLoom?.oee}% OEE) due to ${lowestOeeLoom?.lastStopReason || "weft sensor timeout"}.
4. **Yarn & Warp Beam Warnings:**
   - ${criticalBeams.length > 0 ? `Critical: Warp beam on ${criticalBeams[0].assignedLoomId} has only ${criticalBeams[0].remainingLengthMeters}m remaining.` : "All warp beams running with sufficient yardage."}
   - ${lowLots.length > 0 ? `Weft lot ${lowLots[0].lotNumber} requires staging from warehouse bay.` : "All yarn lots above min threshold."}
5. **Handover Directives:** Incoming shift manager should prioritize beam changeover on Shed B Jacquards and verify climate control at 68% RH.`);
      setReportSignoffStatus("Draft");
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  const handleSignoffAndLock = () => {
    if (!generatedReportText) return;

    const newRecord: ShiftReportRecord = {
      id: `REP-402-${Date.now()}`,
      shiftName: activeShift as any,
      date: new Date().toISOString().split("T")[0],
      shiftManager: "Elena Rostova",
      incomingManager: incomingManagerName,
      totalPicksExecuted: totalPicks,
      totalMetersProduced: totalMeters,
      averageOee: Number(avgOee.toFixed(1)),
      warpStopsTotal: warpStops,
      weftStopsTotal: weftStops,
      topLossLoomId: `${lowestOeeLoom?.id} (${lowestOeeLoom?.lastStopReason || "Stoppage"})`,
      aiBriefingText: generatedReportText,
      signoffStatus: "Approved & Locked",
      signedAt: new Date().toLocaleString(),
    };

    onAddShiftReport(newRecord);
    setReportSignoffStatus("Approved & Locked");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header & APEX Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Home</span>
            <span>/</span>
            <span>Plant Operations & Handover</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Page 40: Automated Shift Reports</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Shift Manager Handover & Automated Reporting
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-xs font-medium">
            <button
              onClick={() => setActiveTab("current")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "current"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Current Shift Handover
            </button>
            <button
              onClick={() => setActiveTab("archive")}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === "archive"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Archived Shift Reports ({shiftReports.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "current" ? (
        <div className="space-y-5">
          {/* Shift Performance Snapshot Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-mono uppercase block mb-1">Active Shift Name</span>
              <div className="font-bold text-slate-900 dark:text-white text-base">{activeShift}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">Superintendent: Elena Rostova</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-mono uppercase block mb-1">Shift Total Woven</span>
              <div className="font-bold font-mono text-slate-900 dark:text-white text-xl">
                {totalMeters.toLocaleString()} m
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                {totalPicks.toLocaleString()} Picks Inserted
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-mono uppercase block mb-1">Average Fleet OEE</span>
              <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-xl">
                {avgOee.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-1">
                Top: {topOeeLoom?.id} ({topOeeLoom?.oee}%)
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-mono uppercase block mb-1">Stoppage Downtime Count</span>
              <div className="font-bold font-mono text-slate-900 dark:text-white text-xl flex items-center space-x-2">
                <span>{warpStops + weftStops} Stops</span>
              </div>
              <div className="text-[11px] text-rose-500 font-mono mt-1">
                {warpStops} Warp • {weftStops} Weft
              </div>
            </div>
          </div>

          {/* Action Toolbar to Generate AI Shift Handover Report */}
          <div className="bg-gradient-to-r from-blue-900/20 via-purple-900/10 to-amber-900/20 border border-blue-500/30 dark:border-blue-500/20 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Automated Shift Handover Intelligence & Root-Cause Briefing
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Compiles all live loom telemetry, downtime occurrences, warp beam run-outs, and warehouse yarn alerts into an audit-ready handover report.
              </p>
            </div>

            <button
              id="generate-shift-report-btn"
              onClick={handleGenerateAutomatedReport}
              disabled={isGeneratingAiReport}
              className="px-4 py-2 rounded font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isGeneratingAiReport ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Shift Briefing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Automated Shift Report</span>
                </>
              )}
            </button>
          </div>

          {/* Generated Report Output & Document Viewer */}
          {generatedReportText && (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              {/* Document Header */}
              <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300">
                      DOC REF: SMR-402-LIVE
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        reportSignoffStatus === "Approved & Locked"
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {reportSignoffStatus}
                    </span>
                    {reportSource && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
                        <Cpu className="w-3 h-3 text-blue-500" />
                        <span>SYNTHESIS: {reportSource.toUpperCase()}</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                    Official Weaving Mill Shift Handover & Production Dossier
                  </h2>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Weaving Facility US-East Plant 04 • Enterprise APEX Automation
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center space-x-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Dossier</span>
                  </button>
                </div>
              </div>

              {/* Report Body (Structured Textile Engineering Report) */}
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed font-sans text-slate-800 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/30 p-5 rounded-lg border border-slate-200/80 dark:border-slate-800 whitespace-pre-wrap font-mono">
                {generatedReportText}
              </div>

              {/* Shift Superintendent Digital Sign-off Block */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Shift Manager Verification & Formal Sign-off
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Outgoing Shift Superintendent</label>
                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white">
                      Elena Rostova (ID: SUP-402-ER)
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Incoming Shift Superintendent</label>
                    <input
                      type="text"
                      value={incomingManagerName}
                      onChange={(e) => setIncomingManagerName(e.target.value)}
                      disabled={reportSignoffStatus === "Approved & Locked"}
                      className="w-full p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 font-mono">
                    {reportSignoffStatus === "Approved & Locked"
                      ? "Cryptographically logged in APEX audit trail."
                      : "Pending final digital signature and locking."}
                  </span>

                  {reportSignoffStatus !== "Approved & Locked" ? (
                    <button
                      onClick={handleSignoffAndLock}
                      className="px-4 py-1.5 rounded font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-1.5 shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lock & Sign Handover Report</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Signed & Archived</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Archive Tab */
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calendar className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historical Shift Handover Records (Audit Trail)
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {shiftReports.map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedArchiveReport(rep)}
                className="py-3.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded cursor-pointer transition-colors flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">{rep.id}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px]">
                      {rep.date}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{rep.shiftName}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 max-w-xl">
                    {rep.aiBriefingText}
                  </div>
                </div>

                <div className="flex items-center space-x-4 font-mono text-right">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{rep.totalMetersProduced.toLocaleString()}m</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400">{rep.averageOee}% OEE</div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    {rep.signoffStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for selected archive report */}
          {selectedArchiveReport && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Archived Shift Report: {selectedArchiveReport.id}
                    </h3>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {selectedArchiveReport.shiftName} • Manager: {selectedArchiveReport.shiftManager} → {selectedArchiveReport.incomingManager}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedArchiveReport(null)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded border border-slate-200 dark:border-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200">
                  {selectedArchiveReport.aiBriefingText}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedArchiveReport(null)}
                    className="px-4 py-1.5 rounded font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

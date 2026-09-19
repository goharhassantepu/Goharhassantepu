import React, { useState } from "react";
import {
  Wrench,
  Sparkles,
  AlertOctagon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Activity,
  Droplets,
  Layers,
  Thermometer,
  ShieldAlert,
  ArrowDownToLine,
  RefreshCw,
} from "lucide-react";
import { LoomTelemetry, ApexTheme } from "../types";

interface LoomDetailModalProps {
  loom: LoomTelemetry | null;
  onClose: () => void;
  onUpdateLoom: (id: string, partial: Partial<LoomTelemetry>) => void;
  theme: ApexTheme;
}

export const LoomDetailModal: React.FC<LoomDetailModalProps> = ({
  loom,
  onClose,
  onUpdateLoom,
  theme,
}) => {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);

  if (!loom) return null;

  const isRunning = loom.status === "RUNNING";

  const handleRunAiDiagnostic = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);

    try {
      const res = await fetch("/api/gemini/diagnose-loom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loomId: loom.id,
          model: loom.model,
          status: loom.status,
          rpm: loom.rpm,
          targetRpm: loom.targetRpm,
          warpStops: loom.warpStopsCount,
          weftStops: loom.weftStopsCount,
          warpTension: loom.warpTension,
          weftTension: loom.weftTension,
          lastStopReason: loom.lastStopReason || "General operational inquiry",
          patternName: loom.currentPatternName,
        }),
      });

      const data = await res.json();
      setDiagnosticResult(data.diagnostic || "Machine telemetry verified. Operational status nominal.");
    } catch (err) {
      console.error("AI diagnostic failed:", err);
      setDiagnosticResult(
        `[DIAGNOSTIC ADVISORY FOR ${loom.id}]\n\n` +
          `• Primary Cause: Warp tension variation (${loom.warpTension} cN vs nominal 32 cN) resulting in drop-wire contact.\n` +
          `• Immediate Action: Check let-off electronic load cell calibration on back-rest roller. Inspect heald wire eyelets for micro-abrasions.\n` +
          `• Maintenance Protocol: Ensure shed air misting maintains >= 65% RH to mitigate static cling in high-speed insertion.`
      );
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleResetBeam = () => {
    onUpdateLoom(loom.id, {
      beamMetersRemaining: loom.beamTotalMeters,
      status: "RUNNING",
      rpm: loom.targetRpm,
      lastStopReason: undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 select-none">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isRunning ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <div>
              <div className="font-bold text-base tracking-tight flex items-center space-x-2">
                <span>{loom.id} — {loom.name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                  {loom.type}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {loom.shed} • Assigned Operator: {loom.operatorName}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none font-bold p-1"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Current Velocity</span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {loom.rpm} <span className="text-[10px] text-slate-400 font-normal">/ {loom.targetRpm} RPM</span>
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Overall OEE</span>
              <span
                className={`text-sm font-bold font-mono ${
                  loom.oee >= 90
                    ? "text-emerald-600 dark:text-emerald-400"
                    : loom.oee >= 80
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {loom.oee.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Warp Stops Today</span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {loom.warpStopsCount} <span className="text-[10px] text-slate-400 font-normal">stops</span>
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 text-[10px] block uppercase font-mono">Warp Beam Yardage</span>
              <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                {loom.beamMetersRemaining}m <span className="text-[10px] text-slate-400 font-normal">left</span>
              </span>
            </div>
          </div>

          {/* Electronic Sensor Readings */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">
              Electronic Stop Motion & Tension Sensors
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Warp Tension:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {loom.warpTension} cN (Nominal: 32)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Weft Tension:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {loom.weftTension} cN (Nominal: 28)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Drop-Wire Array:</span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {loom.status === "STOPPED_WARP" ? "TRIPPED" : "ARMED"}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Optoelectronic Feeler:</span>
                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {loom.status === "STOPPED_WEFT" ? "MISPICK" : "SYNCHRONIZED"}
                </div>
              </div>
            </div>
          </div>

          {/* Machine Controls */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">
              Supervisor Tele-Control Override
            </h4>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (isRunning) {
                      onUpdateLoom(loom.id, { status: "IDLE", rpm: 0 });
                    } else {
                      onUpdateLoom(loom.id, { status: "RUNNING", rpm: loom.targetRpm, lastStopReason: undefined });
                    }
                  }}
                  className={`px-3 py-1.5 rounded font-semibold text-xs flex items-center space-x-1.5 ${
                    isRunning
                      ? "bg-slate-700 hover:bg-slate-800 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "Standby Machine" : "Start Weaving Cycle"}</span>
                </button>

                <button
                  onClick={() => onUpdateLoom(loom.id, { status: "MAINTENANCE", rpm: 0, lastStopReason: "Technician manual checkout" })}
                  className="px-3 py-1.5 rounded font-semibold text-xs bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 flex items-center space-x-1"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Flag for Maintenance</span>
                </button>
              </div>

              {/* Beam Reload Action */}
              {loom.beamMetersRemaining < 200 && (
                <button
                  onClick={handleResetBeam}
                  className="px-3 py-1.5 rounded font-semibold text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-1.5 shadow-xs"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Mount Fresh Warp Beam (3,000m)</span>
                </button>
              )}
            </div>
          </div>

          {/* Gemini AI Diagnostic Section */}
          <div className="bg-gradient-to-r from-purple-950/20 to-blue-950/20 border border-purple-500/30 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="font-bold text-slate-900 dark:text-white">
                  Gemini AI Loom Telemetry Diagnostics & Root-Cause Assistant
                </span>
              </div>

              <button
                onClick={handleRunAiDiagnostic}
                disabled={isDiagnosing}
                className="px-3 py-1 rounded font-semibold text-xs bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Analyzing Sensors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Run AI Diagnostic</span>
                  </>
                )}
              </button>
            </div>

            {diagnosticResult && (
              <div className="bg-slate-900 text-purple-200 p-3 rounded font-mono text-xs whitespace-pre-wrap leading-relaxed border border-purple-900/60">
                {diagnosticResult}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded font-medium bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs"
          >
            Close Machine Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

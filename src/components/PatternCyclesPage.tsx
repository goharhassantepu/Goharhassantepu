import React, { useState } from "react";
import {
  Grid3X3,
  Layers,
  Sparkles,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Eye,
  Sliders,
  Maximize2,
  FileCode,
} from "lucide-react";
import { PatternCycle, ApexTheme } from "../types";

interface PatternCyclesPageProps {
  patterns: PatternCycle[];
  theme: ApexTheme;
}

// Default standard weave matrices for the interactive draft simulator
const PRESET_WEAVES: Record<string, number[][]> = {
  "Plain 1/1": [
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1],
  ],
  "Twill 2/2": [
    [1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 0, 0, 1, 1],
    [1, 0, 0, 1, 1, 0, 0, 1],
    [1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 0, 0, 1, 1],
    [1, 0, 0, 1, 1, 0, 0, 1],
  ],
  "Satin 8-End": [
    [1, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0],
  ],
  "Herringbone": [
    [1, 1, 0, 0, 0, 0, 1, 1],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [1, 0, 0, 1, 1, 0, 0, 1],
    [1, 1, 0, 0, 0, 0, 1, 1],
    [0, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
    [1, 0, 0, 1, 1, 0, 0, 1],
  ],
  "Damask Jacquard": [
    [1, 1, 1, 0, 0, 1, 1, 1],
    [1, 1, 0, 0, 1, 1, 1, 0],
    [1, 0, 0, 1, 1, 1, 0, 1],
    [0, 0, 1, 1, 1, 0, 1, 1],
    [0, 1, 1, 1, 0, 0, 1, 1],
    [1, 1, 1, 0, 0, 1, 1, 1],
    [1, 1, 0, 0, 1, 1, 1, 0],
    [1, 0, 0, 1, 1, 1, 0, 1],
  ],
  "Double Cloth": [
    [1, 0, 1, 1, 1, 0, 1, 1],
    [0, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 0, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1],
    [0, 1, 1, 1, 0, 1, 1, 1],
    [1, 1, 1, 0, 1, 1, 1, 0],
    [1, 1, 0, 1, 1, 1, 0, 1],
  ],
};

export const PatternCyclesPage: React.FC<PatternCyclesPageProps> = ({ patterns, theme }) => {
  const [selectedPattern, setSelectedPattern] = useState<PatternCycle>(patterns[0]);
  const [activePreset, setActivePreset] = useState<string>("Damask Jacquard");
  const [gridMatrix, setGridMatrix] = useState<number[][]>(PRESET_WEAVES["Damask Jacquard"]);
  const [simActivePickRow, setSimActivePickRow] = useState<number>(0);
  const [isAnimatingWeave, setIsAnimatingWeave] = useState<boolean>(true);

  // Weft insertion animation ticker
  React.useEffect(() => {
    if (!isAnimatingWeave) return;
    const interval = setInterval(() => {
      setSimActivePickRow((prev) => (prev + 1) % 8);
    }, 800);
    return () => clearInterval(interval);
  }, [isAnimatingWeave]);

  const handleSelectPreset = (presetName: string) => {
    setActivePreset(presetName);
    if (PRESET_WEAVES[presetName]) {
      setGridMatrix(PRESET_WEAVES[presetName]);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    const next = gridMatrix.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? (cell === 1 ? 0 : 1) : cell))
    );
    setGridMatrix(next);
  };

  const exportCadFile = () => {
    const cadPayload = {
      patternCode: selectedPattern.code,
      patternName: selectedPattern.name,
      hookCount: selectedPattern.hookCount,
      warpEndsTotal: selectedPattern.warpEndsTotal,
      weftPicksRepeat: selectedPattern.weftPicksRepeat,
      weaveStructureMatrix: gridMatrix,
      cadFileRef: selectedPattern.cadFileRef,
      generatedTimestamp: new Date().toISOString(),
      standard: "STA_JACQUARD_ELECTRONIC_EP_V4",
    };

    const blob = new Blob([JSON.stringify(cadPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedPattern.code}_CAD_SPEC.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header & APEX Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Home</span>
            <span>/</span>
            <span>CAD & Production Engineering</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Page 30: Complex Pattern Cycles</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Complex Jacquard & Dobby Pattern Cycles
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportCadFile}
            className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center space-x-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CAD File ({selectedPattern.cadFileRef})</span>
          </button>
        </div>
      </div>

      {/* Pattern Production Cycles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {patterns.map((pat) => {
          const isSelected = selectedPattern.id === pat.id;
          const progressPercent = Math.round((pat.completedMeters / pat.currentOrderQuantityMeters) * 100);

          return (
            <div
              key={pat.id}
              onClick={() => {
                setSelectedPattern(pat);
                if (PRESET_WEAVES[pat.weaveType]) {
                  handleSelectPreset(pat.weaveType);
                }
              }}
              className={`p-4 rounded-lg border text-xs cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "border-blue-500 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-900/15 shadow-sm ring-1 ring-blue-500"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {pat.code}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                      {pat.category}
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200 mt-1">
                    {pat.name}
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  <div className="w-3.5 h-3.5 rounded border border-slate-300" style={{ backgroundColor: pat.previewColor1 }} title="Warp Color" />
                  <div className="w-3.5 h-3.5 rounded border border-slate-300" style={{ backgroundColor: pat.previewColor2 }} title="Weft Color" />
                </div>
              </div>

              {/* Specs & Hooks */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-800/40 p-2 rounded">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Hook / Shaft Density</span>
                  <span className="font-bold text-slate-900 dark:text-white">{pat.hookCount.toLocaleString()} Hooks</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Width & Weight</span>
                  <span className="font-bold text-slate-900 dark:text-white">{pat.targetFabricWidthCm}cm • {pat.weightGsm} GSM</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Warp Ends Total</span>
                  <span className="text-slate-800 dark:text-slate-200">{pat.warpEndsTotal.toLocaleString()} Ends</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Inspection Pass</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{pat.inspectionGradePassRate}% A+</span>
                </div>
              </div>

              {/* Order Cycle Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Order Progress ({progressPercent}%)</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {pat.completedMeters.toLocaleString()}m / {pat.currentOrderQuantityMeters.toLocaleString()}m
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* Active Assigned Looms */}
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500">Target Delivery: {pat.targetCompletionDate}</span>
                <div className="flex items-center space-x-1">
                  {pat.activeLoomIds.map((lid) => (
                    <span key={lid} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono text-[10px]">
                      {lid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Weave Structure & Draft/Peg Plan Simulator */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Grid3X3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Interactive Weave Structure & Draft/Peg Plan Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click individual interlacing matrix cells to toggle warp float (black) vs weft float (gold/white).
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.keys(PRESET_WEAVES).map((weaveName) => (
              <button
                key={weaveName}
                onClick={() => handleSelectPreset(weaveName)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  activePreset === weaveName
                    ? "bg-purple-600 text-white font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {weaveName}
              </button>
            ))}

            <button
              onClick={() => setIsAnimatingWeave(!isAnimatingWeave)}
              className="ml-2 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1"
            >
              <Play className="w-3 h-3 text-emerald-500" />
              <span>{isAnimatingWeave ? "Weft Ticking (Live)" : "Resume Motion"}</span>
            </button>
          </div>
        </div>

        {/* Simulator Workspace: Split between Pixel Matrix and Live Cross-Section Fabric Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: 8x8 Interactive Draft Matrix */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center">
            <div className="flex justify-between w-full max-w-xs text-[11px] font-mono text-slate-500 mb-2">
              <span>Warp Ends (1-8) →</span>
              <span>Weft Repeat: 8 Picks</span>
            </div>

            <div className="grid grid-cols-8 gap-1 p-2 bg-slate-900 rounded border border-slate-700 shadow-inner">
              {gridMatrix.map((row, rIndex) =>
                row.map((cell, cIndex) => {
                  const isWarpUp = cell === 1;
                  const isCurrentSimPick = isAnimatingWeave && simActivePickRow === rIndex;

                  return (
                    <button
                      key={`${rIndex}-${cIndex}`}
                      onClick={() => handleCellClick(rIndex, cIndex)}
                      className={`w-8 h-8 rounded-xs font-mono text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer select-none ${
                        isWarpUp
                          ? "bg-slate-100 text-slate-900 border border-slate-300 shadow-xs"
                          : "bg-amber-600/90 text-white border border-amber-500 shadow-xs"
                      } ${
                        isCurrentSimPick ? "ring-2 ring-emerald-400 scale-105 z-10" : "hover:opacity-80"
                      }`}
                      title={`Pick ${rIndex + 1}, End ${cIndex + 1}: ${isWarpUp ? "Warp Over Weft" : "Weft Over Warp"}`}
                    >
                      {isWarpUp ? "▲" : "▼"}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center space-x-4 mt-3 text-[11px] font-mono text-slate-600 dark:text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-slate-100 border border-slate-400" />
                <span>▲ Warp End Float (Up)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded bg-amber-600 border border-amber-500" />
                <span>▼ Weft Pick Float (Up)</span>
              </div>
            </div>
          </div>

          {/* Right: Realistic Fabric Surface Rendering & Physical Profile */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Simulated Fabric Cross-Section Surface
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Cad Ref: {selectedPattern.cadFileRef}
                </span>
              </div>

              {/* Microscopic Surface Texture Simulation */}
              <div className="h-44 w-full rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-inner flex items-center justify-center bg-slate-900">
                <div
                  className="w-full h-full opacity-90 transition-all duration-300"
                  style={{
                    backgroundImage: `radial-gradient(${selectedPattern.previewColor1} 15%, transparent 16%), radial-gradient(${selectedPattern.previewColor2} 15%, transparent 16%)`,
                    backgroundSize: "16px 16px",
                    backgroundPosition: "0 0, 8px 8px",
                  }}
                />

                <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-white p-2 rounded text-[11px] flex justify-between font-mono">
                  <span>Selected Pattern: {selectedPattern.name}</span>
                  <span className="text-emerald-400 font-bold">{selectedPattern.weaveType}</span>
                </div>
              </div>
            </div>

            {/* Technical Engineering Data */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-mono">WARP CRIMP %</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">8.4%</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-mono">WEFT CRIMP %</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">6.2%</span>
              </div>
              <div className="bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] font-mono">COVER FACTOR</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">24.8 (High Density)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

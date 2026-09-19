import React, { useState } from "react";
import {
  Boxes,
  Layers,
  AlertTriangle,
  Plus,
  ArrowDownToLine,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  PackageCheck,
  Droplets,
  Scale,
  Calendar,
} from "lucide-react";
import { ThreadLot, WarpBeam, ApexTheme } from "../types";

interface ThreadInventoryPageProps {
  threadLots: ThreadLot[];
  onUpdateThreadLot: (id: string, partial: Partial<ThreadLot>) => void;
  warpBeams: WarpBeam[];
  onMountReplacementBeam: (beamId: string, loomId: string) => void;
  theme: ApexTheme;
}

export const ThreadInventoryPage: React.FC<ThreadInventoryPageProps> = ({
  threadLots,
  onUpdateThreadLot,
  warpBeams,
  onMountReplacementBeam,
  theme,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedLotForReplenish, setSelectedLotForReplenish] = useState<ThreadLot | null>(null);
  const [replenishAmountKg, setReplenishAmountKg] = useState<number>(500);

  const filteredLots = threadLots.filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.yarnType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.rackLocation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "ALL" || lot.materialCategory === categoryFilter || lot.materialCategory === "Both";
    return matchesSearch && matchesCategory;
  });

  const lowStockLots = threadLots.filter((t) => t.currentStockKg <= t.minThresholdKg);
  const totalStockKg = threadLots.reduce((acc, t) => acc + t.currentStockKg, 0);

  const handleReplenishSubmit = () => {
    if (!selectedLotForReplenish) return;
    onUpdateThreadLot(selectedLotForReplenish.id, {
      currentStockKg: selectedLotForReplenish.currentStockKg + replenishAmountKg,
    });
    setSelectedLotForReplenish(null);
  };

  return (
    <div className="space-y-5">
      {/* Header & APEX Breadcrumbs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>Home</span>
            <span>/</span>
            <span>Raw Materials & Beaming</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">Page 20: Thread & Warp Inventory</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
            Thread & Warp Beam Inventory Management
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          {lowStockLots.length > 0 && (
            <div className="flex items-center space-x-1 px-3 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 mr-1" />
              <span>{lowStockLots.length} Lots Under Safety Level</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Section: Warp Beams Status (Critical for preventing loom idle stoppage!) */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Warp Beams Telemetry & Run-out Tracker
            </h2>
            <span className="text-xs text-slate-500 font-mono">({warpBeams.length} Master Beams Tracked)</span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Average Beam Life: <span className="font-bold text-slate-800 dark:text-slate-200">32.4 Operating Hours</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {warpBeams.map((beam) => {
            const isExhausted = beam.remainingLengthMeters <= 20;
            const percentRemaining = Math.round((beam.remainingLengthMeters / beam.totalLengthMeters) * 100);

            return (
              <div
                key={beam.id}
                className={`p-3.5 rounded-lg border text-xs flex flex-col justify-between space-y-2.5 ${
                  isExhausted
                    ? "border-rose-300 dark:border-rose-900/60 bg-rose-500/[0.04]"
                    : beam.status === "Sized & Staged"
                    ? "border-emerald-300 dark:border-emerald-900/60 bg-emerald-500/[0.04]"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {beam.beamCode}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {beam.totalEnds.toLocaleString()} Warp Ends • Ø{beam.flangeDiameterMm}mm Flange
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isExhausted
                        ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : beam.status === "Sized & Staged"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                    }`}
                  >
                    {beam.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Remaining Yarn Length:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {beam.remainingLengthMeters.toLocaleString()}m / {beam.totalLengthMeters.toLocaleString()}m
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percentRemaining > 30 ? "bg-blue-600" : percentRemaining > 10 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${percentRemaining}%` }}
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 flex items-center justify-between">
                  <span className="truncate max-w-[170px]" title={beam.sizingAgent}>
                    Sizing: {beam.sizingAgent.split(" ")[0]}
                  </span>

                  {beam.status === "Sized & Staged" ? (
                    <button
                      onClick={() => onMountReplacementBeam(beam.id, beam.assignedLoomId)}
                      className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center space-x-1"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>Mount on {beam.assignedLoomId}</span>
                    </button>
                  ) : (
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Loom: {beam.assignedLoomId} (~{beam.estimatedRunoutHours}h left)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thread / Yarn Lots Interactive Table Region */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4">
        {/* Table Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Thread Inventory & Lot Master Ledger
            </h2>
            <span className="text-xs font-mono text-slate-400">
              (Total Warehouse Yarn: {totalStockKg.toLocaleString()} kg)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Lot, Yarn, Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-2 py-1 rounded text-xs">
              <span className="text-slate-400 text-[11px]">Type:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by Material Category"
                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                <option value="Warp">Warp Yarns</option>
                <option value="Weft">Weft Yarns</option>
              </select>
            </div>
          </div>
        </div>

        {/* APEX Relational Table */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Lot Number</th>
                <th className="p-3">Yarn Classification</th>
                <th className="p-3">Count Specification</th>
                <th className="p-3">Color / Shade</th>
                <th className="p-3">Role</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Safety Min</th>
                <th className="p-3">Allocated Machines</th>
                <th className="p-3">Warehouse Location</th>
                <th className="p-3">Tensile (cN/tex)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
              {filteredLots.map((lot) => {
                const isUnderThreshold = lot.currentStockKg <= lot.minThresholdKg;

                return (
                  <tr
                    key={lot.id}
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                      isUnderThreshold ? "bg-rose-500/[0.03]" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: lot.colorHex }} />
                      <span>{lot.lotNumber}</span>
                    </td>

                    <td className="p-3 font-sans font-medium text-slate-900 dark:text-white">
                      {lot.yarnType}
                    </td>

                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      {lot.countSpecification}
                    </td>

                    <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                      {lot.color}
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          lot.materialCategory === "Warp"
                            ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                            : lot.materialCategory === "Weft"
                            ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {lot.materialCategory}
                      </span>
                    </td>

                    <td className="p-3 font-bold">
                      <span className={isUnderThreshold ? "text-rose-600 dark:text-rose-400 flex items-center" : "text-slate-900 dark:text-white"}>
                        {lot.currentStockKg.toLocaleString()} kg
                        {isUnderThreshold && <AlertTriangle className="w-3 h-3 ml-1 text-rose-500" />}
                      </span>
                    </td>

                    <td className="p-3 text-slate-500">
                      {lot.minThresholdKg.toLocaleString()} kg
                    </td>

                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        {lot.allocatedLooms.map((loomId) => (
                          <span
                            key={loomId}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded text-[10px]"
                          >
                            {loomId}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 font-sans text-slate-500 dark:text-slate-400">
                      {lot.rackLocation}
                    </td>

                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {lot.testedTensileStrength} cN/tex
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLotForReplenish(lot)}
                        className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-sans font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        + Replenish
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Replenish Lot Modal */}
      {selectedLotForReplenish && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-lg max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Receive Yarn Shipment / Replenish
              </h3>
              <button
                onClick={() => setSelectedLotForReplenish(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <span className="text-slate-500">Lot Identifier:</span>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedLotForReplenish.lotNumber}
                </div>
              </div>

              <div>
                <span className="text-slate-500">Yarn Description:</span>
                <div className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {selectedLotForReplenish.yarnType} ({selectedLotForReplenish.countSpecification})
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Received Quantity (kg)
                </label>
                <input
                  type="number"
                  value={replenishAmountKg}
                  onChange={(e) => setReplenishAmountKg(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1.5 font-mono font-bold text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500">
                New Projected Stock: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLotForReplenish.currentStockKg + replenishAmountKg} kg</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedLotForReplenish(null)}
                className="px-3 py-1.5 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleReplenishSubmit}
                className="px-4 py-1.5 rounded font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Confirm Inward Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

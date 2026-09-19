import React, { useState, useEffect, useCallback } from "react";
import { ApexHeader } from "./components/ApexHeader";
import { ApexSidebar } from "./components/ApexSidebar";
import { DashboardView } from "./components/DashboardView";
import { LoomGridPage } from "./components/LoomGridPage";
import { ThreadInventoryPage } from "./components/ThreadInventoryPage";
import { PatternCyclesPage } from "./components/PatternCyclesPage";
import { ShiftReportingPage } from "./components/ShiftReportingPage";
import { DatabaseStudioPage } from "./components/DatabaseStudioPage";
import { WeavingProcessWorkflow } from "./components/WeavingProcessWorkflow";
import { LoomDetailModal } from "./components/LoomDetailModal";
import { SqlConsoleModal } from "./components/SqlConsoleModal";

import {
  INITIAL_LOOMS,
  INITIAL_THREAD_LOTS,
  INITIAL_WARP_BEAMS,
  INITIAL_PATTERN_CYCLES,
  INITIAL_DOWNTIME_LOGS,
  INITIAL_SHIFT_REPORTS,
  DEFAULT_ENVIRONMENTAL,
} from "./data/mockData";
import {
  LoomTelemetry,
  LoomStatus,
  ThreadLot,
  WarpBeam,
  PatternCycle,
  DowntimeEvent,
  ShiftReportRecord,
  ApexTheme,
} from "./types";
import {
  fetchLoomsFromDb,
  fetchThreadsFromDb,
  fetchBeamsFromDb,
  fetchPatternsFromDb,
  fetchDowntimeFromDb,
  fetchShiftReportsFromDb,
  updateLoomInDb,
  updateThreadInDb,
  insertShiftReportInDb,
  ackDowntimeInDb,
  recordDowntimeInDb,
} from "./services/dbService";

export function App() {
  // Navigation & APEX Layout state
  const [currentPageId, setCurrentPageId] = useState<number>(1);
  const [theme, setTheme] = useState<ApexTheme>("vita");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [activeShift, setActiveShift] = useState<string>("Shift A (06:00 - 14:00)");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

  // Weaving Plant State
  const [looms, setLooms] = useState<LoomTelemetry[]>(INITIAL_LOOMS);
  const [threadLots, setThreadLots] = useState<ThreadLot[]>(INITIAL_THREAD_LOTS);
  const [warpBeams, setWarpBeams] = useState<WarpBeam[]>(INITIAL_WARP_BEAMS);
  const [patternCycles, setPatternCycles] = useState<PatternCycle[]>(INITIAL_PATTERN_CYCLES);
  const [downtimeLogs, setDowntimeLogs] = useState<DowntimeEvent[]>(INITIAL_DOWNTIME_LOGS);
  const [shiftReports, setShiftReports] = useState<ShiftReportRecord[]>(INITIAL_SHIFT_REPORTS);
  const [environmental, setEnvironmental] = useState(DEFAULT_ENVIRONMENTAL);

  // Modals
  const [selectedLoomForDetail, setSelectedLoomForDetail] = useState<LoomTelemetry | null>(null);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [sqlConsoleInitialQuery, setSqlConsoleInitialQuery] = useState<string | undefined>(undefined);

  // Hydrate from SQLite database
  const loadDataFromDatabase = useCallback(async () => {
    try {
      const [l, t, b, p, d, r] = await Promise.all([
        fetchLoomsFromDb(),
        fetchThreadsFromDb(),
        fetchBeamsFromDb(),
        fetchPatternsFromDb(),
        fetchDowntimeFromDb(),
        fetchShiftReportsFromDb(),
      ]);
      if (l && l.length > 0) setLooms(l);
      if (t && t.length > 0) setThreadLots(t);
      if (b && b.length > 0) setWarpBeams(b);
      if (p && p.length > 0) setPatternCycles(p);
      if (d && d.length > 0) setDowntimeLogs(d);
      if (r && r.length > 0) setShiftReports(r);
      setIsDbLoaded(true);
    } catch (err) {
      console.warn("Using local cache fallback while database connects:", err);
    }
  }, []);

  useEffect(() => {
    loadDataFromDatabase();
  }, [loadDataFromDatabase]);

  // Apply dark class to root document if theme is dark
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  // Real-time Plant Simulation Engine (Simulates picks insertion, linear meters, and telemetry jitter)
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setLooms((prevLooms) =>
        prevLooms.map((loom) => {
          if (loom.status !== "RUNNING") {
            return loom;
          }

          // Small RPM jitter (+/- 2 rpm) scaled by simSpeed
          const rpmJitter = (Math.floor(Math.random() * 5) - 2) * simSpeed;
          const currentRpm = Math.max(
            loom.targetRpm - 20,
            Math.min(loom.targetRpm + 10, loom.rpm + rpmJitter)
          );

          // In 2 seconds, picks produced at current RPM:
          const newPicks = Math.round(((currentRpm / 60) * 2) * simSpeed);
          const totalPicks = loom.totalPicksShift + newPicks;

          // Linear meters = picks / (picksPerCm * 100)
          const addedMeters = Number((newPicks / (loom.picksPerCm * 100)).toFixed(2));
          const totalMeters = Number((loom.totalMetersShift + addedMeters).toFixed(1));

          // Warp beam decrement
          const remainingBeam = Math.max(
            0,
            Number((loom.beamMetersRemaining - addedMeters).toFixed(1))
          );

          // Tension fluctuations
          const warpTensionJitter = Math.floor(Math.random() * 3) - 1;
          const weftTensionJitter = Math.floor(Math.random() * 3) - 1;

          // Check if beam is run out
          let newStatus: LoomStatus = loom.status;
          let stopReason = loom.lastStopReason;
          if (remainingBeam <= 0 && loom.status === "RUNNING") {
            newStatus = "BEAM_OUT";
            stopReason = "Warp beam exhausted at flange end";
          }

          return {
            ...loom,
            rpm: newStatus === "RUNNING" ? currentRpm : 0,
            status: newStatus,
            lastStopReason: stopReason,
            totalPicksShift: totalPicks,
            totalMetersShift: totalMeters,
            beamMetersRemaining: remainingBeam,
            warpTension: Math.max(20, Math.min(50, loom.warpTension + warpTensionJitter)),
            weftTension: Math.max(18, Math.min(45, loom.weftTension + weftTensionJitter)),
          };
        })
      );

      // Minor environmental drift
      setEnvironmental((prev: typeof DEFAULT_ENVIRONMENTAL) => ({
        ...prev,
        relativeHumidity: Number((68.0 + (Math.random() * 1.2 - 0.6)).toFixed(1)),
        temperatureC: Number((22.8 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
      }));
    }, 2000 / simSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed]);

  // Handlers for state updates with SQLite persistence
  const handleUpdateLoom = (id: string, partial: Partial<LoomTelemetry>) => {
    setLooms((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...partial } : l))
    );
    if (selectedLoomForDetail && selectedLoomForDetail.id === id) {
      setSelectedLoomForDetail((prev) => (prev ? { ...prev, ...partial } : null));
    }
    // Asynchronously synchronize with SQLite database
    updateLoomInDb(id, partial).catch((err) =>
      console.warn("Could not sync loom update to database:", err)
    );
  };

  const handleUpdateThreadLot = (id: string, partial: Partial<ThreadLot>) => {
    setThreadLots((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...partial } : t))
    );
    // Asynchronously synchronize with SQLite database
    updateThreadInDb(id, partial).catch((err) =>
      console.warn("Could not sync thread lot update to database:", err)
    );
  };

  const handleMountReplacementBeam = (beamId: string, loomId: string) => {
    // Update beam status
    setWarpBeams((prev) =>
      prev.map((b) =>
        b.id === beamId
          ? { ...b, status: "Mounted & Weaving", remainingLengthMeters: b.totalLengthMeters }
          : b
      )
    );

    // Update loom
    handleUpdateLoom(loomId, {
      beamMetersRemaining: 3000,
      status: "RUNNING",
      rpm: 720,
      lastStopReason: undefined,
    });
  };

  const handleAddShiftReport = (newReport: ShiftReportRecord) => {
    setShiftReports((prev) => [newReport, ...prev]);
    insertShiftReportInDb(newReport).catch((err) =>
      console.warn("Could not persist shift report to database:", err)
    );
  };

  const handleAcknowledgeDowntime = (id: string) => {
    setDowntimeLogs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "ACKNOWLEDGED" as const } : d))
    );
    ackDowntimeInDb(id).catch((err) =>
      console.warn("Could not acknowledge downtime in database:", err)
    );
  };

  const handleInjectTestBreak = () => {
    const runningLooms = looms.filter((l) => l.status === "RUNNING");
    if (runningLooms.length === 0) return;
    const target = runningLooms[Math.floor(Math.random() * runningLooms.length)];

    handleUpdateLoom(target.id, {
      status: "STOPPED_WARP",
      rpm: 0,
      warpStopsCount: target.warpStopsCount + 1,
      lastStopReason: "Warp drop wire #84 contact tripped by knot",
    });

    const newLog: DowntimeEvent = {
      id: `DWN-${Date.now().toString().slice(-4)}`,
      loomId: target.id,
      type: "WARP",
      reason: "Simulated warp drop wire contact tripped",
      durationMinutes: 1,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      resolvedBy: target.operatorName,
      status: "ACTIVE",
    };

    setDowntimeLogs((prev) => [newLog, ...prev]);
    recordDowntimeInDb(newLog).catch((err) =>
      console.warn("Could not record downtime incident to database:", err)
    );
  };

  const handleNavigate = (pageNumber: number) => {
    setCurrentPageId(pageNumber);
  };

  // Critical alerts calculation
  const runningLoomsCount = looms.filter((l) => l.status === "RUNNING").length;
  const criticalAlertsCount =
    looms.filter((l) => l.status !== "RUNNING").length +
    threadLots.filter((t) => t.currentStockKg <= t.minThresholdKg).length;
  const fleetOee = looms.length
    ? looms.reduce((sum, l) => sum + l.oee, 0) / looms.length
    : 0;

  return (
    <div
      className={`min-h-screen flex flex-col font-sans antialiased select-none ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : theme === "redwood"
          ? "bg-[#faf8f5] text-stone-900"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Oracle APEX Top Application Header */}
      <ApexHeader
        theme={theme}
        setTheme={setTheme}
        activeShift={activeShift}
        setActiveShift={setActiveShift}
        isSimulating={isSimulating}
        setIsSimulating={setIsSimulating}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenSqlConsole={() => setIsSqlModalOpen(true)}
        criticalAlertsCount={criticalAlertsCount}
        onNavigatePage={handleNavigate}
      />

      {/* Main Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* APEX Left Navigation Sidebar */}
        <ApexSidebar
          currentPageId={currentPageId}
          onSelectPage={handleNavigate}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          theme={theme}
          runningLoomsCount={runningLoomsCount}
          totalLoomsCount={looms.length}
          fleetOee={fleetOee}
          criticalAlertsCount={criticalAlertsCount}
        />

        {/* APEX Main Page Body Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentPageId === 1 && (
              <DashboardView
                looms={looms}
                onUpdateLoom={handleUpdateLoom}
                threadLots={threadLots}
                warpBeams={warpBeams}
                downtimeLogs={downtimeLogs}
                onAcknowledgeDowntime={handleAcknowledgeDowntime}
                onOpenLoomDetail={(loom) => setSelectedLoomForDetail(loom)}
                onNavigatePage={handleNavigate}
                onInjectTestBreak={handleInjectTestBreak}
                theme={theme}
              />
            )}

            {currentPageId === 10 && (
              <LoomGridPage
                looms={looms}
                onUpdateLoom={handleUpdateLoom}
                onOpenLoomDetail={(loom) => setSelectedLoomForDetail(loom)}
                theme={theme}
              />
            )}

            {currentPageId === 20 && (
              <ThreadInventoryPage
                threadLots={threadLots}
                onUpdateThreadLot={handleUpdateThreadLot}
                warpBeams={warpBeams}
                onMountReplacementBeam={handleMountReplacementBeam}
                theme={theme}
              />
            )}

            {currentPageId === 30 && (
              <PatternCyclesPage
                patterns={patternCycles}
                theme={theme}
              />
            )}

            {currentPageId === 40 && (
              <ShiftReportingPage
                looms={looms}
                threadLots={threadLots}
                warpBeams={warpBeams}
                downtimeLogs={downtimeLogs}
                shiftReports={shiftReports}
                onAddShiftReport={handleAddShiftReport}
                activeShift={activeShift}
                theme={theme}
              />
            )}

            {currentPageId === 50 && (
              <DatabaseStudioPage
                theme={theme}
                onRefreshData={loadDataFromDatabase}
              />
            )}

            {currentPageId === 60 && (
              <WeavingProcessWorkflow
                theme={theme}
                onOpenSqlWithQuery={(sql) => {
                  setSqlConsoleInitialQuery(sql);
                  setIsSqlModalOpen(true);
                }}
              />
            )}
          </div>
        </main>
      </div>

      {/* Machine Diagnostic & Telemetry Modal */}
      <LoomDetailModal
        loom={selectedLoomForDetail}
        onClose={() => setSelectedLoomForDetail(null)}
        onUpdateLoom={handleUpdateLoom}
        theme={theme}
      />

      {/* APEX SQL Workshop Modal */}
      <SqlConsoleModal
        isOpen={isSqlModalOpen}
        onClose={() => {
          setIsSqlModalOpen(false);
          setSqlConsoleInitialQuery(undefined);
        }}
        looms={looms}
        threadLots={threadLots}
        warpBeams={warpBeams}
        patterns={patternCycles}
        theme={theme}
        onRefreshData={loadDataFromDatabase}
        initialQuery={sqlConsoleInitialQuery}
      />
    </div>
  );
}
export default App;

import React from "react";
import {
  Layers,
  Search,
  Clock,
  Play,
  Pause,
  FastForward,
  User,
  Database,
  Palette,
  Bell,
  RefreshCw,
  Network,
} from "lucide-react";
import { ApexTheme } from "../types";

interface ApexHeaderProps {
  theme: ApexTheme;
  setTheme: (t: ApexTheme) => void;
  activeShift: string;
  setActiveShift: (shift: string) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenSqlConsole: () => void;
  criticalAlertsCount: number;
  onNavigatePage: (pageId: number) => void;
}

export const ApexHeader: React.FC<ApexHeaderProps> = ({
  theme,
  setTheme,
  activeShift,
  setActiveShift,
  isSimulating,
  setIsSimulating,
  simSpeed,
  setSimSpeed,
  searchQuery,
  setSearchQuery,
  onOpenSqlConsole,
  criticalAlertsCount,
  onNavigatePage,
}) => {
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleTimeString());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const headerBgClass =
    theme === "redwood"
      ? "bg-[#312d2a] text-[#f4efe6] border-[#4a443e]"
      : theme === "dark"
      ? "bg-[#0f172a] text-slate-100 border-slate-800"
      : "bg-[#1e293b] text-white border-slate-700";

  return (
    <header className={`w-full border-b sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between shadow-sm select-none ${headerBgClass}`}>
      {/* Left: APEX App Identity */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-bold text-white shadow-sm text-sm tracking-wider">
            APX
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm tracking-tight">Oracle APEX 24.1</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                PROD-04
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono flex items-center space-x-1.5">
              <span className="font-semibold text-amber-300">APP 402</span>
              <span>:</span>
              <span className="text-slate-200 font-medium">WEAVETEC_ENTERPRISE</span>
            </div>
          </div>
        </div>

        <div className="hidden lg:block h-6 w-px bg-slate-700 mx-2" />

        {/* Global Search Bar */}
        <div className="relative hidden md:block w-64 lg:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            id="apex-global-search-input"
            type="text"
            placeholder="Search Loom, Pattern, Lot, Yarn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 text-xs rounded-md pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 focus:border-amber-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Center: Shift & Real-Time Telemetry Toggles */}
      <div className="flex items-center space-x-2">
        {/* Active Shift Selector */}
        <div className="flex items-center bg-slate-800/70 border border-slate-700 rounded-md px-2 py-1 text-xs space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <select
            id="apex-shift-selector"
            value={activeShift}
            onChange={(e) => setActiveShift(e.target.value)}
            aria-label="Active Shift"
            className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
          >
            <option value="Shift A (06:00 - 14:00)" className="bg-slate-900 text-white">Shift A (06:00 - 14:00)</option>
            <option value="Shift B (14:00 - 22:00)" className="bg-slate-900 text-white">Shift B (14:00 - 22:00)</option>
            <option value="Shift C (22:00 - 06:00)" className="bg-slate-900 text-white">Shift C (22:00 - 06:00)</option>
          </select>
        </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center bg-slate-800/70 border border-slate-700 rounded-md px-1.5 py-0.5 space-x-1">
          <button
            id="apex-sim-play-pause-btn"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`p-1 rounded text-xs flex items-center space-x-1 transition-colors ${
              isSimulating ? "text-emerald-400 hover:bg-emerald-500/20" : "text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isSimulating ? "Pause Loom Telemetry Simulation" : "Resume Loom Telemetry Simulation"}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px] font-mono font-medium hidden sm:inline">
              {isSimulating ? "LIVE" : "PAUSED"}
            </span>
          </button>

          <button
            id="apex-sim-speed-btn"
            onClick={() => setSimSpeed(simSpeed === 1 ? 5 : simSpeed === 5 ? 10 : 1)}
            className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-700 text-slate-300 hover:text-white"
            title="Toggle simulation speed multiplier"
          >
            {simSpeed}x
          </button>
        </div>

        {/* Live Mill Heartbeat */}
        <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-slate-300 bg-slate-800/40 px-2 py-1 rounded border border-slate-700/50">
          <span className={`w-2 h-2 rounded-full ${isSimulating ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span>{currentTime}</span>
        </div>
      </div>

      {/* Right: APEX Quick Navigation & Tools */}
      <div className="flex items-center space-x-2">
        {/* Critical Alerts Counter */}
        <button
          id="apex-header-alerts-btn"
          onClick={() => onNavigatePage(40)}
          className="relative p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Critical Weaving & Inventory Alerts"
        >
          <Bell className="w-4 h-4" />
          {criticalAlertsCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center animate-bounce">
              {criticalAlertsCount}
            </span>
          )}
        </button>

        {/* Weaving ERD Quick Switch */}
        <button
          id="apex-header-erd-btn"
          onClick={() => onNavigatePage(60)}
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-colors"
          title="Weaving Process ER Diagram Architecture (10 Tables)"
        >
          <Network className="w-3.5 h-3.5" />
          <span>ERD Process</span>
        </button>

        {/* SQL Workshop Button */}
        <button
          id="apex-header-sql-workshop-btn"
          onClick={onOpenSqlConsole}
          className="hidden sm:flex items-center space-x-1 px-2.5 py-1 text-xs rounded font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
          title="Open Oracle APEX SQL Workshop"
        >
          <Database className="w-3.5 h-3.5" />
          <span>SQL Workshop</span>
        </button>

        {/* Theme Switcher */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded p-0.5 text-xs">
          <button
            onClick={() => setTheme("vita")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              theme === "vita" ? "bg-blue-600 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
            title="APEX Vita Universal Theme"
          >
            Vita
          </button>
          <button
            onClick={() => setTheme("redwood")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              theme === "redwood" ? "bg-[#c74a2b] text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Oracle Redwood Theme"
          >
            Redwood
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
              theme === "dark" ? "bg-slate-700 text-white shadow-xs" : "text-slate-400 hover:text-slate-200"
            }`}
            title="Industrial Dark Theme"
          >
            Dark
          </button>
        </div>

        {/* Shift Superintendent Profile */}
        <div className="flex items-center space-x-2 pl-1 border-l border-slate-700">
          <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold text-amber-300">
            ER
          </div>
          <div className="hidden md:block text-left">
            <div className="text-[11px] font-semibold leading-none text-slate-200">Elena Rostova</div>
            <div className="text-[9px] text-slate-400 leading-tight">Shift Superintendent</div>
          </div>
        </div>
      </div>
    </header>
  );
};

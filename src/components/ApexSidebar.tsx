import React from "react";
import {
  LayoutDashboard,
  TableProperties,
  Boxes,
  Grid3X3,
  FileText,
  Database,
  Network,
  ChevronLeft,
  ChevronRight,
  Activity,
  Droplets,
  Thermometer,
  Gauge,
  AlertTriangle,
} from "lucide-react";
import { ApexTheme } from "../types";

interface ApexSidebarProps {
  currentPageId: number;
  onSelectPage: (pageId: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  theme: ApexTheme;
  runningLoomsCount: number;
  totalLoomsCount: number;
  fleetOee: number;
  criticalAlertsCount: number;
}

export const ApexSidebar: React.FC<ApexSidebarProps> = ({
  currentPageId,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  theme,
  runningLoomsCount,
  totalLoomsCount,
  fleetOee,
  criticalAlertsCount,
}) => {
  const pages = [
    {
      id: 1,
      name: "Floor Telemetry & OEE",
      code: "PAGE 1",
      icon: LayoutDashboard,
      badge: `${runningLoomsCount}/${totalLoomsCount}`,
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      id: 10,
      name: "Loom Productivity Grid",
      code: "PAGE 10",
      icon: TableProperties,
      badge: "Interactive",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      id: 20,
      name: "Thread & Beam Inventory",
      code: "PAGE 20",
      icon: Boxes,
      badge: criticalAlertsCount > 0 ? `${criticalAlertsCount} Low` : "Optimal",
      badgeColor: criticalAlertsCount > 0 ? "bg-rose-500/20 text-rose-300 border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      id: 30,
      name: "Pattern Production Cycles",
      code: "PAGE 30",
      icon: Grid3X3,
      badge: "14K Jacquard",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
    {
      id: 40,
      name: "Shift Handover Reports",
      code: "PAGE 40",
      icon: FileText,
      badge: "AI Ready",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
    {
      id: 50,
      name: "APEX SQL Workshop",
      code: "PAGE 50",
      icon: Database,
      badge: "DQL/DML",
      badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    },
    {
      id: 60,
      name: "Weaving Process ERD",
      code: "PAGE 60",
      icon: Network,
      badge: "10 Tables",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    },
  ];

  const sidebarBg =
    theme === "redwood"
      ? "bg-[#252220] border-[#3d3733] text-[#f4efe6]"
      : theme === "dark"
      ? "bg-[#0b1120] border-slate-800 text-slate-200"
      : "bg-slate-900 border-slate-800 text-slate-200";

  return (
    <aside
      className={`h-[calc(100vh-53px)] border-r transition-all duration-200 flex flex-col justify-between shrink-0 select-none ${sidebarBg} ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Top: Navigation List */}
      <div className="p-3 space-y-4 overflow-y-auto">
        {/* APEX Breadcrumb / Section Header */}
        {!collapsed && (
          <div className="flex items-center justify-between px-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold">
              APEX Navigation Tree
            </div>
            <button
              id="apex-collapse-sidebar-btn"
              onClick={onToggleCollapse}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center mb-2">
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Expand sidebar"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="space-y-1">
          {pages.map((p) => {
            const Icon = p.icon;
            const isActive = currentPageId === p.id;
            return (
              <button
                key={p.id}
                id={`apex-nav-page-${p.id}`}
                onClick={() => onSelectPage(p.id)}
                className={`w-full flex items-center rounded-md px-2.5 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? theme === "redwood"
                      ? "bg-[#c74a2b] text-white font-semibold shadow-xs"
                      : "bg-blue-600 text-white font-semibold shadow-xs"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}
                title={p.name}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                {!collapsed && (
                  <div className="ml-3 flex-1 flex items-center justify-between text-left">
                    <div>
                      <div className="leading-tight">{p.name}</div>
                      <div className={`text-[9px] font-mono ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                        {p.code}
                      </div>
                    </div>
                    {p.badge && (
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ml-1 ${
                          isActive ? "bg-white/20 text-white border-white/30" : p.badgeColor
                        }`}
                      >
                        {p.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Environmental Telemetry Panel (Critical for Weaving yarn tension & static control!) */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-semibold flex items-center space-x-1">
                <Thermometer className="w-3 h-3 text-amber-400" />
                <span>Shed Atmosphere (RH/Temp)</span>
              </span>
            </div>

            <div className="bg-slate-800/60 rounded-md p-2.5 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-medium">Shed A (Airjet)</span>
                <span className="text-[11px] font-mono font-semibold text-emerald-400">24.2°C • 68% RH</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full w-[68%]" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-medium">Shed B (Jacquard)</span>
                <span className="text-[11px] font-mono font-semibold text-blue-400">23.8°C • 71% RH</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-400 h-full rounded-full w-[71%]" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-300 font-medium">Shed C (Technical)</span>
                <span className="text-[11px] font-mono font-semibold text-amber-400">25.0°C • 65% RH</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full w-[65%]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom: Fleet Health Snapshot */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
        {!collapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                <span>Shift Fleet OEE</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{fleetOee.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  fleetOee >= 90 ? "bg-emerald-500" : fleetOee >= 80 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.min(fleetOee, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
              <span>Target: 90.0%</span>
              <span className="text-emerald-300">+{Math.max(0, fleetOee - 90).toFixed(1)}% vs Plan</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-1">
            <Gauge className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="text-[9px] font-mono font-bold text-slate-200">{fleetOee.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </aside>
  );
};

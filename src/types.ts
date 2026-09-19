export type LoomStatus = "RUNNING" | "STOPPED_WARP" | "STOPPED_WEFT" | "MAINTENANCE" | "BEAM_OUT" | "IDLE";

export type LoomType = "Air Jet" | "Rapier" | "Jacquard Electronic" | "Water Jet" | "Dobby High-Speed";

export interface LoomTelemetry {
  id: string; // e.g. "LM-101"
  name: string;
  shed: "Shed A (High-Speed)" | "Shed B (Jacquard Fine)" | "Shed C (Technical Weaves)";
  model: string; // e.g. "Picanol OmniPlus-i", "Dornier P2 Rapier", "Staubli Jacquard SX"
  type: LoomType;
  status: LoomStatus;
  rpm: number; // current picks/min (e.g. 750 - 1100)
  targetRpm: number;
  oee: number; // Overall Equipment Effectiveness % (e.g. 89.4)
  efficiency: number; // %
  currentPatternId: string;
  currentPatternName: string;
  warpLotId: string;
  weftLotId: string;
  totalPicksShift: number;
  totalMetersShift: number;
  picksPerCm: number; // PPI / PPC
  warpStopsCount: number;
  weftStopsCount: number;
  warpTension: number; // cN (centinewtons)
  weftTension: number; // cN
  beamMetersRemaining: number; // meters left on warp beam
  beamTotalMeters: number;
  lastStopReason?: string;
  lastStopTimestamp?: string;
  operatorName: string;
}

export interface ThreadLot {
  id: string; // e.g. "LOT-CT-401"
  lotNumber: string;
  yarnType: string; // e.g. "Combed Cotton", "Mulberry Silk 20/22D", "Polyester DTY 150D/48F", "Merino Worsted", "Linen 60 Lea"
  countSpecification: string; // e.g. "Ne 40/1", "Ne 30/2", "150D / 48F", "60s Lea"
  color: string;
  colorHex: string;
  supplier: string;
  materialCategory: "Warp" | "Weft" | "Both";
  currentStockKg: number;
  minThresholdKg: number;
  allocatedLooms: string[];
  rackLocation: string; // e.g. "Warehouse-A / Bay 04 / Shelf 2"
  unitPricePerKg: number;
  batchMoistureRegain: number; // % moisture
  testedTensileStrength: number; // cN/tex
}

export interface WarpBeam {
  id: string; // e.g. "BEAM-802"
  beamCode: string;
  flangeDiameterMm: number;
  totalEnds: number; // e.g. 7,200 ends
  totalLengthMeters: number;
  remainingLengthMeters: number;
  sizingAgent: string; // e.g. "Modified Starch + PVA 8%"
  assignedLoomId: string;
  patternId: string;
  status: "Mounted & Weaving" | "Sized & Staged" | "Warper Creel Loading" | "Exhausted";
  estimatedRunoutHours: number;
}

export interface PatternCycle {
  id: string; // e.g. "PAT-JAC-901"
  code: string;
  name: string;
  category: "Jacquard Luxury" | "High-Density Twill" | "Technical Ripstop" | "Sateen Sheeting" | "Dobby Geometric";
  hookCount: number; // e.g. 12,000 hooks or 24 shaft dobby
  warpEndsTotal: number;
  weftPicksRepeat: number;
  targetFabricWidthCm: number;
  weightGsm: number;
  currentOrderQuantityMeters: number;
  completedMeters: number;
  cycleStartDate: string;
  targetCompletionDate: string;
  inspectionGradePassRate: number; // % e.g. 98.4%
  weaveType: "Damask Jacquard" | "Twill 2/2" | "Satin 8-End" | "Herringbone" | "Plain 1/1" | "Double Cloth";
  previewColor1: string;
  previewColor2: string;
  cadFileRef: string;
  activeLoomIds: string[];
}

export interface DowntimeEvent {
  id: string;
  loomId: string;
  type: "WARP" | "WEFT" | "MECHANICAL" | "BEAM_CHANGE" | "SCHEDULED_MAINT";
  reason: string;
  durationMinutes: number;
  timestamp: string;
  resolvedBy?: string;
  status: "RESOLVED" | "ACTIVE" | "ACKNOWLEDGED";
}

export interface ShiftReportRecord {
  id: string;
  shiftName: "Shift A (06:00 - 14:00)" | "Shift B (14:00 - 22:00)" | "Shift C (22:00 - 06:00)";
  date: string;
  shiftManager: string;
  incomingManager: string;
  totalPicksExecuted: number;
  totalMetersProduced: number;
  averageOee: number;
  warpStopsTotal: number;
  weftStopsTotal: number;
  topLossLoomId: string;
  aiBriefingText: string;
  signoffStatus: "Draft" | "Pending Signoff" | "Approved & Locked";
  signedAt?: string;
}

export type ApexTheme = "vita" | "redwood" | "dark";

// ==========================================
// 10 CORE WEAVING PROCESS ER DIAGRAM ENTITIES
// ==========================================

export interface YarnLotRecord {
  lot_id: number; // PK
  yarn_count: string; // e.g. "Ne 40/1 Combed Cotton"
  supplier: string; // e.g. "Vardhman Textiles"
  received_date: string; // YYYY-MM-DD
}

export interface WarpBeamRecord {
  beam_id: number; // PK
  lot_id: number; // FK -> YARN_LOT
  total_ends: number; // e.g. 6400
  beam_length: number; // e.g. 4500.0 (meters)
}

export interface SizedBeamRecord {
  sized_beam_id: number; // PK
  beam_id: number; // FK -> WARP_BEAM
  size_recipe: string; // e.g. "PVA 6% + Modified Starch 4% + Wax Emulsion 0.5%"
  sizing_date: string; // YYYY-MM-DD
}

export interface WeftPackageRecord {
  package_id: number; // PK
  lot_id: number; // FK -> YARN_LOT
  count: string; // e.g. "Ne 40/1"
}

export interface LoomRecord {
  loom_id: number; // PK
  loom_type: string; // e.g. "Air Jet", "Rapier", "Electronic Jacquard"
  reed_width: number; // e.g. 190.0, 220.0, 340.0 (cm)
}

export interface LoomJobRecord {
  job_id: number; // PK
  loom_id: number; // FK -> LOOM
  sized_beam_id: number; // FK -> SIZED_BEAM
  package_id: number; // FK -> WEFT_PACKAGE
  article_no: string; // e.g. "ART-OXFORD-204"
  start_date: string; // YYYY-MM-DD
  status: "RUNNING" | "SETUP" | "COMPLETED" | "PAUSED";
}

export interface FabricRollRecord {
  roll_id: number; // PK
  job_id: number; // FK -> LOOM_JOB
  length_mtrs: number; // e.g. 100.0
  grade: "Grade A" | "Grade B" | "Grade C" | "Pending Inspection";
}

export interface InspectionRecord {
  inspection_id: number; // PK
  roll_id: number; // FK -> FABRIC_ROLL
  defect_points: number; // 4-point penalty per 100 sq meters
  inspector: string; // Inspector Name
}

export interface MendingRecord {
  mending_id: number; // PK
  inspection_id: number; // FK -> INSPECTION
  defect_type: string; // e.g. "Broken Pick", "Warp Float", "Slub", "Oil Spot"
  status: "PENDING" | "IN_PROGRESS" | "REPAIRED" | "REJECTED";
}

export interface PackedLotRecord {
  pack_id: number; // PK
  roll_id: number; // FK -> FABRIC_ROLL (1:1 / 1:0..1)
  customer_po: string; // e.g. "PO-TARGET-7741"
  dispatch_date: string; // YYYY-MM-DD
}

export interface WeavingProcessDatabaseState {
  yarnLots: YarnLotRecord[];
  warpBeams: WarpBeamRecord[];
  sizedBeams: SizedBeamRecord[];
  weftPackages: WeftPackageRecord[];
  looms: LoomRecord[];
  loomJobs: LoomJobRecord[];
  fabricRolls: FabricRollRecord[];
  inspections: InspectionRecord[];
  mendings: MendingRecord[];
  packedLots: PackedLotRecord[];
}

export interface FullLineageTrace {
  roll: FabricRollRecord;
  job: LoomJobRecord;
  loom: LoomRecord;
  sizedBeam: SizedBeamRecord;
  warpBeam: WarpBeamRecord;
  warpYarnLot: YarnLotRecord;
  weftPackage: WeftPackageRecord;
  weftYarnLot: YarnLotRecord;
  inspection?: InspectionRecord;
  mendings: MendingRecord[];
  packedLot?: PackedLotRecord;
}

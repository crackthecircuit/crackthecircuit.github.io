// Core data model for circuits and levels. Everything here is plain JSON so it can be
// stored in undo history, autosaved to localStorage, and written as level data.

export type Bit = 0 | 1;

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

/** Input ports, top to bottom. A gate with n inputs uses in0…in(n-1); NOT and output terminals use in0 only. */
export type InputPortId = 'in0' | 'in1' | 'in2' | 'in3';
export type PortId = InputPortId | 'out';

export interface Point {
  x: number;
  y: number;
}

/** A level input terminal (e.g. switch "A"). Drives a signal through its `out` port. */
export interface InputNode {
  id: string;
  kind: 'input';
  label: string;
  pos: Point;
}

/** A level output terminal (e.g. lamp "Q"). Receives a signal on its `in0` port. */
export interface OutputNode {
  id: string;
  kind: 'output';
  label: string;
  pos: Point;
}

export interface GateNode {
  id: string;
  kind: 'gate';
  gateType: GateType;
  /** Number of inputs (2–4) for gates that can be widened. Omitted means the gate type's minimum. */
  inputs?: number;
  pos: Point;
}

export type CircuitNode = InputNode | OutputNode | GateNode;

export interface Wire {
  id: string;
  from: { nodeId: string; port: 'out' };
  to: { nodeId: string; port: InputPortId };
}

export interface Circuit {
  nodes: CircuitNode[];
  wires: Wire[];
}

export interface Level {
  id: string;
  number: number;
  title: string;
  brief: string;
  /** Input terminal labels, most significant bit first (row i uses the bits of i). */
  inputs: string[];
  /** Output terminal labels. MVP levels have exactly one. */
  outputs: string[];
  /** Expected value of each output for every row, indexed by row number (length 2^inputs). */
  expected: Record<string, Bit[]>;
  palette: GateType[];
  /** Widest gate allowed (inputs per gate). Defaults to 2. */
  maxGateInputs?: number;
  par: number;
  hints: [string, string, string];
  /** Gate added to the player's unlocked gates when this level is passed. */
  unlocksGate?: GateType;
}

export type ValidationCode =
  | 'MISSING_TERMINAL'
  | 'INVALID_WIRE'
  | 'FLOATING_INPUT'
  | 'OUTPUT_UNCONNECTED'
  | 'MULTIPLE_DRIVERS'
  | 'CYCLE';

export interface ValidationError {
  code: ValidationCode;
  /** Nodes to highlight in the workspace. */
  nodeIds: string[];
  /** Wires to highlight in the workspace. */
  wireIds: string[];
  /** Plain-language explanation shown to the player. */
  message: string;
}

export interface RowResult {
  index: number;
  inputs: Record<string, Bit>;
  outputs: Record<string, Bit>;
  expected: Record<string, Bit>;
  pass: boolean;
  /** Signal carried by every evaluated wire for this row (wires from unused gates are absent). */
  wireValues: Record<string, Bit>;
}

export type SimulationResult =
  | { status: 'invalid'; errors: ValidationError[]; unusedGateIds: string[] }
  | {
      status: 'ok';
      rows: RowResult[];
      passedCount: number;
      allPassed: boolean;
      unusedGateIds: string[];
    };

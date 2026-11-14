import { evaluateGate, portsOf } from './gates';
import type { Bit, Circuit, Level, RowResult, SimulationResult } from './types';
import { analyze } from './validate';

/** Input values for row `index`: binary counting with the first input as the most significant bit. */
export function rowInputs(index: number, labels: readonly string[]): Record<string, Bit> {
  const values: Record<string, Bit> = {};
  labels.forEach((label, i) => {
    values[label] = ((index >> (labels.length - 1 - i)) & 1) as Bit;
  });
  return values;
}

/** Run the player's circuit for all 2^n input combinations and compare against the level's truth table. */
export function simulate(circuit: Circuit, level: Level): SimulationResult {
  const analysis = analyze(circuit, level);
  const { errors, unusedGateIds, evalOrder, inputNodeIds, outputNodeIds, drivers } = analysis;
  if (errors.length > 0) return { status: 'invalid', errors, unusedGateIds };

  const driverOf = (nodeId: string, port: string) => drivers.get(`${nodeId}:${port}`)![0]!;
  const rowCount = 2 ** level.inputs.length;
  const rows: RowResult[] = [];

  for (let index = 0; index < rowCount; index++) {
    const inputs = rowInputs(index, level.inputs);
    const signal = new Map<string, Bit>(); // node id -> value on its output port
    for (const label of level.inputs) signal.set(inputNodeIds[label]!, inputs[label]!);

    for (const gate of evalOrder) {
      const values = portsOf(gate).inputs.map((port) => signal.get(driverOf(gate.id, port).from.nodeId)!);
      signal.set(gate.id, evaluateGate(gate.gateType, values));
    }

    const outputs: Record<string, Bit> = {};
    const expected: Record<string, Bit> = {};
    for (const label of level.outputs) {
      outputs[label] = signal.get(driverOf(outputNodeIds[label]!, 'in0').from.nodeId)!;
      expected[label] = level.expected[label]![index]!;
    }

    const wireValues: Record<string, Bit> = {};
    for (const wire of circuit.wires) {
      const value = signal.get(wire.from.nodeId);
      if (value !== undefined) wireValues[wire.id] = value;
    }

    const pass = level.outputs.every((label) => outputs[label] === expected[label]);
    rows.push({ index, inputs, outputs, expected, pass, wireValues });
  }

  const passedCount = rows.filter((r) => r.pass).length;
  return { status: 'ok', rows, passedCount, allPassed: passedCount === rowCount, unusedGateIds };
}

export * from './types';
export {
  GATE_SPECS,
  GATE_TYPES,
  INPUT_PORTS,
  evaluateGate,
  gateInputCount,
  portsOf,
  describePort,
} from './gates';
export { analyze, validate } from './validate';
export type { Analysis } from './validate';
export { simulate, rowInputs } from './simulate';
export { countGates, score } from './score';
export { parseExpression, parseExpressions, evaluateExpr, circuitExpression, flatten } from './expression';
export type { Expr } from './expression';

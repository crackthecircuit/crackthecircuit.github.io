// Boolean expressions, in the notation used in the BCIS 1302 lecture slides:
//   A·B or AB (AND, binds tighter than OR) · A + B (OR) · A ⊕ B (XOR) · A' or ¬A (NOT, drawn as an overbar).
// Used to show hints/briefs in lecture notation and to describe the player's own circuit as an equation.
import { gateInputCount, INPUT_PORTS } from './gates';
import type { Circuit, Level } from './types';

export type Expr =
  | { kind: 'var'; name: string }
  | { kind: 'const'; value: 0 | 1 }
  | { kind: 'not'; arg: Expr }
  | { kind: 'and' | 'or' | 'xor'; args: Expr[] }
  /** An input with nothing connected. */
  | { kind: 'unknown' }
  /** A signal that feeds back into itself. */
  | { kind: 'loop' };

export const v = (name: string): Expr => ({ kind: 'var', name });
export const not = (arg: Expr): Expr => ({ kind: 'not', arg });
export const and = (...args: Expr[]): Expr => ({ kind: 'and', args });
export const or = (...args: Expr[]): Expr => ({ kind: 'or', args });
export const xor = (...args: Expr[]): Expr => ({ kind: 'xor', args });

// ---------------------------------------------------------------- parsing

type Token = { type: 'var'; name: string } | { type: 'const'; value: 0 | 1 } | { type: 'op'; op: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  for (const ch of src) {
    if (/\s/.test(ch)) continue;
    if (/[A-Z]/.test(ch)) tokens.push({ type: 'var', name: ch });
    else if (ch === '0' || ch === '1') tokens.push({ type: 'const', value: ch === '1' ? 1 : 0 });
    else if ("()+·*⊕^¬!'’=".includes(ch)) tokens.push({ type: 'op', op: ch });
    else throw new Error(`Unexpected "${ch}" in expression "${src}"`);
  }
  return tokens;
}

/**
 * Parse one expression, or a chain of equal expressions ("A + B = (A'·B')'"), into a list.
 * Grammar (loosest first): OR (+), XOR (⊕ or ^), AND (· * or juxtaposition), NOT (prefix ¬/! or postfix ').
 */
export function parseExpressions(src: string): Expr[] {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const isOp = (op: string) => peek()?.type === 'op' && (peek() as { op: string }).op === op;
  const take = (op: string) => {
    if (!isOp(op)) throw new Error(`Expected "${op}" in expression "${src}"`);
    i++;
  };

  const parseOr = (): Expr => {
    const args = [parseXor()];
    while (isOp('+')) {
      i++;
      args.push(parseXor());
    }
    return args.length === 1 ? args[0]! : { kind: 'or', args };
  };
  const parseXor = (): Expr => {
    const args = [parseAnd()];
    while (isOp('⊕') || isOp('^')) {
      i++;
      args.push(parseAnd());
    }
    return args.length === 1 ? args[0]! : { kind: 'xor', args };
  };
  const startsOperand = () => {
    const t = peek();
    return !!t && (t.type !== 'op' || t.op === '(' || t.op === '¬' || t.op === '!');
  };
  const parseAnd = (): Expr => {
    const args = [parseUnary()];
    for (;;) {
      if (isOp('·') || isOp('*')) {
        i++;
        args.push(parseUnary());
      } else if (startsOperand()) {
        args.push(parseUnary()); // juxtaposition: AB means A·B
      } else break;
    }
    return args.length === 1 ? args[0]! : { kind: 'and', args };
  };
  const parseUnary = (): Expr => {
    if (isOp('¬') || isOp('!')) {
      i++;
      return not(parseUnary());
    }
    let e = parseAtom();
    while (isOp("'") || isOp('’')) {
      i++;
      e = not(e);
    }
    return e;
  };
  const parseAtom = (): Expr => {
    const t = peek();
    if (!t) throw new Error(`Unexpected end of expression "${src}"`);
    if (t.type === 'var') {
      i++;
      return v(t.name);
    }
    if (t.type === 'const') {
      i++;
      return { kind: 'const', value: t.value };
    }
    take('(');
    const inner = parseOr();
    take(')');
    return inner;
  };

  const chain = [parseOr()];
  while (isOp('=')) {
    i++;
    chain.push(parseOr());
  }
  if (i < tokens.length) throw new Error(`Unexpected token in expression "${src}"`);
  return chain;
}

export const parseExpression = (src: string): Expr => parseExpressions(src)[0]!;

// ---------------------------------------------------------------- evaluation

/** Evaluate an expression for given variable values (used to check level data against its rule). */
export function evaluateExpr(e: Expr, values: Record<string, 0 | 1>): 0 | 1 {
  switch (e.kind) {
    case 'var':
      return values[e.name] ?? 0;
    case 'const':
      return e.value;
    case 'not':
      return evaluateExpr(e.arg, values) === 1 ? 0 : 1;
    case 'and':
      return e.args.every((a) => evaluateExpr(a, values) === 1) ? 1 : 0;
    case 'or':
      return e.args.some((a) => evaluateExpr(a, values) === 1) ? 1 : 0;
    case 'xor':
      return (e.args.filter((a) => evaluateExpr(a, values) === 1).length % 2) as 0 | 1;
    case 'unknown':
    case 'loop':
      return 0;
  }
}

// ---------------------------------------------------------------- from a circuit

/**
 * The Boolean equation the player's circuit computes for an output, read backwards from the output terminal.
 * Unconnected inputs become `unknown` and feedback loops become `loop`; nothing is guessed as 0.
 */
export function circuitExpression(circuit: Circuit, level: Level, output = level.outputs[0]!): Expr {
  const nodes = new Map(circuit.nodes.map((n) => [n.id, n]));
  const driver = new Map(circuit.wires.map((w) => [`${w.to.nodeId}:${w.to.port}`, w.from.nodeId]));
  const outNode = circuit.nodes.find((n) => n.kind === 'output' && n.label === output);
  if (!outNode) return { kind: 'unknown' };

  const exprOf = (nodeId: string | undefined, path: Set<string>): Expr => {
    const node = nodeId === undefined ? undefined : nodes.get(nodeId);
    if (!node) return { kind: 'unknown' };
    if (node.kind === 'input') return v(node.label);
    if (node.kind === 'output') return { kind: 'unknown' };
    if (path.has(node.id)) return { kind: 'loop' };
    const inner = new Set(path).add(node.id);
    const args = INPUT_PORTS.slice(0, gateInputCount(node)).map((p) =>
      exprOf(driver.get(`${node.id}:${p}`), inner),
    );
    switch (node.gateType) {
      case 'AND':
        return and(...args);
      case 'OR':
        return or(...args);
      case 'XOR':
        return xor(...args);
      case 'NOT':
        return not(args[0]!);
      case 'NAND':
        return not(and(...args));
      case 'NOR':
        return not(or(...args));
    }
  };

  return exprOf(driver.get(`${outNode.id}:in0`), new Set());
}

/** Merge nested ANDs/ORs/XORs (A·(B·C) → A·B·C) so the equation reads like the lecture notes. */
export function flatten(e: Expr): Expr {
  switch (e.kind) {
    case 'not':
      return not(flatten(e.arg));
    case 'and':
    case 'or':
    case 'xor': {
      const args = e.args.map(flatten).flatMap((a) => (a.kind === e.kind ? a.args : [a]));
      return { kind: e.kind, args };
    }
    default:
      return e;
  }
}

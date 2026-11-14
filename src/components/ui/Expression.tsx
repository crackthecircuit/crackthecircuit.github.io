import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { flatten, parseExpressions } from '../../engine';
import type { Expr } from '../../engine';
import styles from './Expression.module.css';

// Precedence, loosest first: OR < XOR < AND < NOT/atoms (AND before OR, as in the lecture notes).
const PREC = { or: 1, xor: 2, and: 3 } as const;

const isLiteral = (e: Expr) =>
  e.kind === 'var' ||
  e.kind === 'const' ||
  (e.kind === 'not' && (e.arg.kind === 'var' || e.arg.kind === 'const'));

function render(e: Expr, parentPrec: number): ReactNode {
  switch (e.kind) {
    case 'var':
      return <span className={styles.var}>{e.name}</span>;
    case 'const':
      return e.value;
    case 'unknown':
      return (
        <span className={styles.unknown} title="Not connected">
          ?
        </span>
      );
    case 'loop':
      return (
        <span className={styles.unknown} title="Feedback loop">
          ↻
        </span>
      );
    case 'not':
      // An overbar groups on its own, so the inner expression never needs brackets.
      return <span className={styles.bar}>{render(e.arg, 0)}</span>;
    case 'and':
    case 'or':
    case 'xor': {
      const prec = PREC[e.kind];
      // Products of plain literals are written side by side (A̅BC̅), like the slides; anything else uses ·.
      const sep = e.kind === 'or' ? ' + ' : e.kind === 'xor' ? ' ⊕ ' : e.args.every(isLiteral) ? '' : '·';
      const body = e.args.map((arg, i) => (
        <Fragment key={i}>
          {i > 0 && sep}
          {e.kind === 'and' ? render(arg, prec) : <span className={styles.term}>{render(arg, prec)}</span>}
        </Fragment>
      ));
      return prec < parentPrec ? <>({body})</> : <>{body}</>;
    }
  }
}

/** A Boolean expression in lecture notation: overbars for NOT, AB or A·B for AND, + for OR, ⊕ for XOR. */
export function Expression({ expr }: { expr: Expr }) {
  return <span className={styles.expr}>{render(flatten(expr), 0)}</span>;
}

/**
 * Text with embedded expressions between dollar signs: "Q = $A'B + AB'$". A chain like
 * "$A + B = (A'B')'$" shows each form separated by "=".
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/\$([^$]+)\$/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        return (
          <span key={i} className={styles.expr}>
            {parseExpressions(part).map((expr, j) => (
              <Fragment key={j}>
                {j > 0 && ' = '}
                {render(flatten(expr), 0)}
              </Fragment>
            ))}
          </span>
        );
      })}
    </>
  );
}

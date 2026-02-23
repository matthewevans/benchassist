declare module 'lp-model' {
  export class Var {
    readonly lb: number | '-infinity';
    readonly ub: number | '+infinity';
    readonly vtype: 'CONTINUOUS' | 'BINARY' | 'INTEGER';
    readonly name: string;
    value: number | null;
  }

  export class Constr {
    readonly lhs: Expression;
    readonly comparison: '<=' | '=' | '>=';
    readonly rhs: number;
    primal: number | null;
    dual: number | null;
  }

  /** An expression element: a Var (coeff 1), a number (constant), or [coeff, Var]. */
  export type ExpressionTerm = Var | number | [number, Var];
  export type Expression = ExpressionTerm[];

  export class Model {
    variables: Map<string, Var>;
    constraints: Constr[];
    objective: { expression: Expression; sense: 'MAXIMIZE' | 'MINIMIZE' };
    solution: unknown;
    status: string | null;
    ObjVal: number | null;

    addVar(options?: {
      lb?: number | '-infinity';
      ub?: number | '+infinity';
      vtype?: 'CONTINUOUS' | 'BINARY' | 'INTEGER';
      name?: string;
    }): Var;

    addVars(
      varNames: string[],
      options?: {
        lb?: number | '-infinity';
        ub?: number | '+infinity';
        vtype?: 'CONTINUOUS' | 'BINARY' | 'INTEGER';
      },
    ): Record<string, Var>;

    setObjective(expression: Expression, sense: 'MAXIMIZE' | 'MINIMIZE'): void;

    addConstr(
      lhs: Expression,
      comparison: '<=' | '=' | '>=' | '==',
      rhs: number | Expression,
    ): Constr;

    toLPFormat(): string;

    /** Solve the model using a solver instance (e.g., HiGHS). */
    solve(solver: unknown, options?: Record<string, unknown>): Promise<void>;

    clear(): void;
    isQuadratic(): boolean;
  }
}

/**
 * Standalone Dynamic Formula Engine
 * Safe Recursive Descent Parser & AST Evaluator for Financial Calculations
 * No eval(), no code injection - purely deterministic AST evaluation.
 */

export interface Token {
  type: 'NUMBER' | 'IDENTIFIER' | 'OPERATOR' | 'PUNCTUATION' | 'KEYWORD';
  value: string;
  pos: number;
}

export type ASTNode =
  | { type: 'Literal'; value: number }
  | { type: 'Variable'; name: string }
  | { type: 'UnaryOp'; operator: string; argument: ASTNode }
  | { type: 'BinaryOp'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'FunctionCall'; name: string; args: ASTNode[] }
  | { type: 'Conditional'; condition: ASTNode; consequent: ASTNode; alternate: ASTNode };

export interface EvaluationResult {
  value: number;
  steps: string[];
  resolvedVariables: Record<string, number>;
  error?: string;
}

export class FormulaEngine {
  /**
   * Tokenizes an expression string
   */
  public static tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (integers & decimals)
      if (/[0-9]/.test(char) || (char === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
        let numStr = '';
        const startPos = i;
        while (i < len && /[0-9.]/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: numStr, pos: startPos });
        continue;
      }

      // Multi-character comparison & logical operators: ==, !=, >=, <=, &&, ||
      const twoChars = expr.slice(i, i + 2);
      if (['==', '!=', '>=', '<=', '&&', '||'].includes(twoChars)) {
        tokens.push({ type: 'OPERATOR', value: twoChars, pos: i });
        i += 2;
        continue;
      }

      // Single-character operators
      if (['+', '-', '*', '/', '^', '%', '>', '<', '!'].includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char, pos: i });
        i++;
        continue;
      }

      // Parentheses & commas
      if (['(', ')', ','].includes(char)) {
        tokens.push({ type: 'PUNCTUATION', value: char, pos: i });
        i++;
        continue;
      }

      // Identifiers / Function Names / Keywords (e.g. IF, AND, OR, Variable01, LO_COUNT)
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        const startPos = i;
        while (i < len && /[a-zA-Z0-9_]/.test(expr[i])) {
          ident += expr[i];
          i++;
        }
        const upper = ident.toUpperCase();
        if (upper === 'AND' || upper === 'OR' || upper === 'NOT') {
          tokens.push({ type: 'OPERATOR', value: upper, pos: startPos });
        } else {
          tokens.push({ type: 'IDENTIFIER', value: ident, pos: startPos });
        }
        continue;
      }

      throw new Error(`حرف غير معروف في المعادلة: '${char}' عند الموضع ${i}`);
    }

    return tokens;
  }

  /**
   * Parses token stream into AST using recursive descent
   */
  public static parse(tokens: Token[]): ASTNode {
    let index = 0;

    const peek = (): Token | undefined => tokens[index];
    const consume = (expectedValue?: string): Token => {
      const t = tokens[index];
      if (!t) {
        throw new Error('انتهت المعادلة بشكل مفاجئ قبل اكتمال التعبير');
      }
      if (expectedValue && t.value.toUpperCase() !== expectedValue.toUpperCase()) {
        throw new Error(`توقع '${expectedValue}' ولكن وجد '${t.value}' عند الموضع ${t.pos}`);
      }
      index++;
      return t;
    };

    const parseExpression = (): ASTNode => {
      let node = parseLogicalAnd();
      while (peek() && (peek()!.value.toUpperCase() === 'OR' || peek()!.value === '||')) {
        const op = consume().value;
        const right = parseLogicalAnd();
        node = { type: 'BinaryOp', operator: op.toUpperCase(), left: node, right };
      }
      return node;
    };

    const parseLogicalAnd = (): ASTNode => {
      let node = parseComparison();
      while (peek() && (peek()!.value.toUpperCase() === 'AND' || peek()!.value === '&&')) {
        const op = consume().value;
        const right = parseComparison();
        node = { type: 'BinaryOp', operator: op.toUpperCase(), left: node, right };
      }
      return node;
    };

    const parseComparison = (): ASTNode => {
      let node = parseAddition();
      while (peek() && ['==', '!=', '>=', '<=', '>', '<', '='].includes(peek()!.value)) {
        let op = consume().value;
        if (op === '=') op = '==';
        const right = parseAddition();
        node = { type: 'BinaryOp', operator: op, left: node, right };
      }
      return node;
    };

    const parseAddition = (): ASTNode => {
      let node = parseMultiplication();
      while (peek() && (peek()!.value === '+' || peek()!.value === '-')) {
        const op = consume().value;
        const right = parseMultiplication();
        node = { type: 'BinaryOp', operator: op, left: node, right };
      }
      return node;
    };

    const parseMultiplication = (): ASTNode => {
      let node = parseExponentiation();
      while (peek() && ['*', '/', '%'].includes(peek()!.value)) {
        const op = consume().value;
        const right = parseExponentiation();
        node = { type: 'BinaryOp', operator: op, left: node, right };
      }
      return node;
    };

    const parseExponentiation = (): ASTNode => {
      let node = parseUnary();
      while (peek() && peek()!.value === '^') {
        const op = consume().value;
        const right = parseUnary();
        node = { type: 'BinaryOp', operator: op, left: node, right };
      }
      return node;
    };

    const parseUnary = (): ASTNode => {
      const cur = peek();
      if (cur && (cur.value === '-' || cur.value.toUpperCase() === 'NOT' || cur.value === '!')) {
        const op = consume().value.toUpperCase();
        const arg = parseUnary();
        return { type: 'UnaryOp', operator: op === '!' ? 'NOT' : op, argument: arg };
      }
      return parsePrimary();
    };

    const parsePrimary = (): ASTNode => {
      const token = peek();
      if (!token) {
        throw new Error('توقع قيمة أو تعبير، لكن تم الوصول إلى نهاية المعادلة');
      }

      // Grouping: ( expr )
      if (token.type === 'PUNCTUATION' && token.value === '(') {
        consume('(');
        const expr = parseExpression();
        consume(')');
        return expr;
      }

      // Number literal
      if (token.type === 'NUMBER') {
        consume();
        const num = parseFloat(token.value);
        if (isNaN(num)) {
          throw new Error(`قيمة رقمية غير صالحة: '${token.value}'`);
        }
        return { type: 'Literal', value: num };
      }

      // Identifier: function call or variable
      if (token.type === 'IDENTIFIER') {
        const identToken = consume();
        const name = identToken.value;

        // Check if function call e.g. IF(...), MIN(...)
        if (peek() && peek()!.value === '(') {
          consume('(');
          const args: ASTNode[] = [];
          if (peek() && peek()!.value !== ')') {
            args.push(parseExpression());
            while (peek() && peek()!.value === ',') {
              consume(',');
              args.push(parseExpression());
            }
          }
          consume(')');

          const upperName = name.toUpperCase();
          if (upperName === 'IF') {
            if (args.length !== 3) {
              throw new Error(`دالة IF تتطلب 3 وسائط (الشرط، القيمة إذا تحقق، القيمة إذا لم يتحقق)؛ تم تقديم ${args.length}`);
            }
            return {
              type: 'Conditional',
              condition: args[0],
              consequent: args[1],
              alternate: args[2],
            };
          }

          return { type: 'FunctionCall', name: upperName, args };
        }

        // It is a variable identifier
        return { type: 'Variable', name };
      }

      throw new Error(`رمز غير متوقع: '${token.value}' عند الموضع ${token.pos}`);
    };

    const ast = parseExpression();
    if (index < tokens.length) {
      throw new Error(`رموز إضافية غير مستهلكة بعد المعادلة: '${tokens[index].value}'`);
    }

    return ast;
  }

  /**
   * Normalizes variable names for case-insensitivity & aliases
   */
  public static normalizeVarName(name: string): string {
    const clean = name.trim();
    const upper = clean.toUpperCase();

    // Match Variable01..10, Var01..10, V01..10, V1..10
    const m = upper.match(/^(?:VARIABLE|VAR|V)0?([1-9]|10)$/);
    if (m) {
      const idx = parseInt(m[1], 10);
      return idx < 10 ? `Variable0${idx}` : `Variable${idx}`;
    }

    return clean;
  }

  /**
   * Evaluates an AST node with variable scope
   */
  public static evaluateNode(
    node: ASTNode,
    scope: Record<string, number>,
    steps: string[],
    traceDepth = 0
  ): number {
    switch (node.type) {
      case 'Literal':
        return node.value;

      case 'Variable': {
        const normalized = FormulaEngine.normalizeVarName(node.name);
        let val: number | undefined = scope[normalized];
        if (val === undefined) {
          const key = Object.keys(scope).find(
            (k) => k.toLowerCase() === node.name.toLowerCase() || FormulaEngine.normalizeVarName(k) === normalized
          );
          if (key !== undefined) {
            val = scope[key];
          }
        }

        if (val === undefined || isNaN(val)) {
          steps.push(`المتغير ${node.name} غير متوفر، تم اعتباره = 0`);
          return 0;
        }
        return val;
      }

      case 'UnaryOp': {
        const argVal = FormulaEngine.evaluateNode(node.argument, scope, steps, traceDepth + 1);
        if (node.operator === '-') return -argVal;
        if (node.operator === 'NOT') return argVal === 0 ? 1 : 0;
        throw new Error(`معامل أحادي غير معروف: ${node.operator}`);
      }

      case 'BinaryOp': {
        const leftVal = FormulaEngine.evaluateNode(node.left, scope, steps, traceDepth + 1);
        const rightVal = FormulaEngine.evaluateNode(node.right, scope, steps, traceDepth + 1);

        switch (node.operator) {
          case '+':
            return leftVal + rightVal;
          case '-':
            return leftVal - rightVal;
          case '*':
            return leftVal * rightVal;
          case '/':
            if (rightVal === 0) {
              steps.push(`تحذير: محاولة قسمة على صفر (${leftVal} / 0)، تم إرجاع 0`);
              return 0;
            }
            return leftVal / rightVal;
          case '%':
            return rightVal === 0 ? 0 : leftVal % rightVal;
          case '^':
            return Math.pow(leftVal, rightVal);
          case '>':
            return leftVal > rightVal ? 1 : 0;
          case '<':
            return leftVal < rightVal ? 1 : 0;
          case '>=':
            return leftVal >= rightVal ? 1 : 0;
          case '<=':
            return leftVal <= rightVal ? 1 : 0;
          case '==':
            return Math.abs(leftVal - rightVal) < 0.000001 ? 1 : 0;
          case '!=':
            return Math.abs(leftVal - rightVal) >= 0.000001 ? 1 : 0;
          case 'AND':
          case '&&':
            return leftVal !== 0 && rightVal !== 0 ? 1 : 0;
          case 'OR':
          case '||':
            return leftVal !== 0 || rightVal !== 0 ? 1 : 0;
          default:
            throw new Error(`معامل ثنائي غير مدعوم: ${node.operator}`);
        }
      }

      case 'Conditional': {
        const cond = FormulaEngine.evaluateNode(node.condition, scope, steps, traceDepth + 1);
        const isTrue = cond !== 0;
        if (isTrue) {
          const res = FormulaEngine.evaluateNode(node.consequent, scope, steps, traceDepth + 1);
          steps.push(`تحقق الشرط (${cond} = نعم) -> النتيجة = ${res.toFixed(2)}`);
          return res;
        } else {
          const res = FormulaEngine.evaluateNode(node.alternate, scope, steps, traceDepth + 1);
          steps.push(`لم يتحقق الشرط (${cond} = لا) -> القيمة البديلة = ${res.toFixed(2)}`);
          return res;
        }
      }

      case 'FunctionCall': {
        const evaluatedArgs = node.args.map((arg) =>
          FormulaEngine.evaluateNode(arg, scope, steps, traceDepth + 1)
        );

        switch (node.name) {
          case 'MIN':
            if (evaluatedArgs.length === 0) return 0;
            return Math.min(...evaluatedArgs);

          case 'MAX':
            if (evaluatedArgs.length === 0) return 0;
            return Math.max(...evaluatedArgs);

          case 'ROUND':
            if (evaluatedArgs.length === 0) return 0;
            const decimals = evaluatedArgs[1] !== undefined ? Math.round(evaluatedArgs[1]) : 0;
            const factor = Math.pow(10, decimals);
            return Math.round(evaluatedArgs[0] * factor) / factor;

          case 'ABS':
            return evaluatedArgs.length > 0 ? Math.abs(evaluatedArgs[0]) : 0;

          case 'FLOOR':
            return evaluatedArgs.length > 0 ? Math.floor(evaluatedArgs[0]) : 0;

          case 'CEIL':
            return evaluatedArgs.length > 0 ? Math.ceil(evaluatedArgs[0]) : 0;

          case 'CLAMP': {
            const v = evaluatedArgs[0] || 0;
            const min = evaluatedArgs[1] !== undefined ? evaluatedArgs[1] : 0;
            const max = evaluatedArgs[2] !== undefined ? evaluatedArgs[2] : v;
            return Math.min(Math.max(v, min), max);
          }

          case 'TIER': {
            const val = evaluatedArgs[0] || 0;
            for (let i = 1; i + 1 < evaluatedArgs.length; i += 2) {
              const threshold = evaluatedArgs[i];
              const rate = evaluatedArgs[i + 1];
              if (val < threshold) {
                return rate;
              }
            }
            return evaluatedArgs.length % 2 === 0
              ? evaluatedArgs[evaluatedArgs.length - 1]
              : evaluatedArgs[evaluatedArgs.length - 2] || 0;
          }

          default:
            throw new Error(`دالة غير مدعومة: ${node.name}`);
        }
      }
    }
  }

  /**
   * Evaluates expression string safely with variable scope
   */
  public static evaluate(
    expression: string,
    variables: Record<string, number>
  ): EvaluationResult {
    const steps: string[] = [];
    const normalizedScope: Record<string, number> = {};

    Object.entries(variables).forEach(([k, v]) => {
      const normalizedKey = FormulaEngine.normalizeVarName(k);
      normalizedScope[normalizedKey] = Number(v) || 0;
      normalizedScope[k] = Number(v) || 0;
    });

    try {
      if (!expression || expression.trim() === '') {
        return { value: 0, steps: ['معادلة فارغة -> القيمة = 0'], resolvedVariables: normalizedScope };
      }

      const tokens = FormulaEngine.tokenize(expression);
      const ast = FormulaEngine.parse(tokens);
      const rawResult = FormulaEngine.evaluateNode(ast, normalizedScope, steps);

      const cleanResult = isNaN(rawResult) || !isFinite(rawResult) ? 0 : Math.round(rawResult * 100) / 100;
      return {
        value: cleanResult,
        steps,
        resolvedVariables: normalizedScope,
      };
    } catch (err: any) {
      return {
        value: 0,
        steps: [...steps, `خطأ في المعالجة: ${err.message || err}`],
        resolvedVariables: normalizedScope,
        error: err.message || String(err),
      };
    }
  }

  /**
   * Validates expression syntax and extracts referenced variable names
   */
  public static validate(expression: string): {
    isValid: boolean;
    error?: string;
    variablesFound: string[];
  } {
    try {
      if (!expression || !expression.trim()) {
        return { isValid: false, error: 'المعادلة فارغة', variablesFound: [] };
      }
      const tokens = FormulaEngine.tokenize(expression);
      const ast = FormulaEngine.parse(tokens);

      const vars = new Set<string>();
      const walk = (n: ASTNode) => {
        if (n.type === 'Variable') {
          vars.add(FormulaEngine.normalizeVarName(n.name));
        } else if (n.type === 'BinaryOp') {
          walk(n.left);
          walk(n.right);
        } else if (n.type === 'UnaryOp') {
          walk(n.argument);
        } else if (n.type === 'Conditional') {
          walk(n.condition);
          walk(n.consequent);
          walk(n.alternate);
        } else if (n.type === 'FunctionCall') {
          n.args.forEach(walk);
        }
      };
      walk(ast);

      return {
        isValid: true,
        variablesFound: Array.from(vars),
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: err.message || String(err),
        variablesFound: [],
      };
    }
  }
}

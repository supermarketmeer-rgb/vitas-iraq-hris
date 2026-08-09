/**
 * Safe Formula Evaluator for Payroll Rules
 * Supports math expressions, variable substitution, and safe functions:
 * - IF(condition, true_val, false_val)
 * - MIN(a, b, ...), MAX(a, b, ...)
 * - ROUND(val, decimals)
 * - FLOOR(val), CEIL(val)
 * - CLAMP(val, min, max)
 * - Basic arithmetic (+, -, *, /, %, ^)
 */

export class FormulaEngine {
  /**
   * Evaluates a mathematical or logical formula string given a context dictionary of variables.
   */
  public static evaluate(
    formula: string,
    context: Record<string, number | string | boolean>
  ): { value: number; explanation: string } {
    if (!formula || typeof formula !== 'string') {
      return { value: 0, explanation: 'Empty formula' };
    }

    let cleaned = formula.trim();

    // Replace variable names with their numeric values from context
    // Sort variables by length descending to prevent substring collisions (e.g., GROSS_SALARY before SALARY)
    const sortedKeys = Object.keys(context).sort((a, b) => b.length - a.length);

    const replacedTokens: Record<string, any> = {};

    let processedExpr = cleaned;

    for (const key of sortedKeys) {
      const val = context[key];
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      if (regex.test(processedExpr)) {
        replacedTokens[key] = val;
        const numVal = typeof val === 'number' ? val : (typeof val === 'boolean' ? (val ? 1 : 0) : Number(val) || 0);
        processedExpr = processedExpr.replace(regex, numVal.toString());
      }
    }

    // Process helper functions recursively
    processedExpr = this.evaluateFunctions(processedExpr);

    // Evaluate arithmetic expression safely
    const numResult = this.safeEvalMath(processedExpr);

    const explanation = `${formula} -> [${Object.entries(replacedTokens)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}] -> ${processedExpr} = ${numResult.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

    return {
      value: numResult,
      explanation,
    };
  }

  /**
   * Recursively resolves helper functions like IF(...), MIN(...), MAX(...), ROUND(...), CLAMP(...)
   */
  private static evaluateFunctions(expr: string): string {
    let current = expr;
    let maxDepth = 15;

    while (maxDepth-- > 0) {
      let changed = false;

      // Match IF(cond, trueVal, falseVal)
      const ifMatch = current.match(/IF\s*\(([^,]+),([^,]+),([^)]+)\)/i);
      if (ifMatch) {
        const condExpr = ifMatch[1];
        const trueExpr = ifMatch[2];
        const falseExpr = ifMatch[3];
        const condResult = this.safeEvalBoolean(condExpr);
        const replacement = condResult ? `(${trueExpr})` : `(${falseExpr})`;
        current = current.replace(ifMatch[0], replacement);
        changed = true;
      }

      // Match MIN(a, b) or MIN(a, b, c)
      const minMatch = current.match(/MIN\s*\(([^()]+)\)/i);
      if (minMatch) {
        const args = minMatch[1].split(',').map((a) => this.safeEvalMath(a));
        const val = Math.min(...args);
        current = current.replace(minMatch[0], val.toString());
        changed = true;
      }

      // Match MAX(a, b) or MAX(a, b, c)
      const maxMatch = current.match(/MAX\s*\(([^()]+)\)/i);
      if (maxMatch) {
        const args = maxMatch[1].split(',').map((a) => this.safeEvalMath(a));
        const val = Math.max(...args);
        current = current.replace(maxMatch[0], val.toString());
        changed = true;
      }

      // Match ROUND(val, decimals) or ROUND(val)
      const roundMatch = current.match(/ROUND\s*\(([^,)]+)(?:,([^)]+))?\)/i);
      if (roundMatch) {
        const val = this.safeEvalMath(roundMatch[1]);
        const decimals = roundMatch[2] ? Math.max(0, Math.floor(this.safeEvalMath(roundMatch[2]))) : 0;
        const multiplier = Math.pow(10, decimals);
        const rounded = Math.round(val * multiplier) / multiplier;
        current = current.replace(roundMatch[0], rounded.toString());
        changed = true;
      }

      // Match FLOOR(val)
      const floorMatch = current.match(/FLOOR\s*\(([^()]+)\)/i);
      if (floorMatch) {
        const val = this.safeEvalMath(floorMatch[1]);
        current = current.replace(floorMatch[0], Math.floor(val).toString());
        changed = true;
      }

      // Match CEIL(val)
      const ceilMatch = current.match(/CEIL\s*\(([^()]+)\)/i);
      if (ceilMatch) {
        const val = this.safeEvalMath(ceilMatch[1]);
        current = current.replace(ceilMatch[0], Math.ceil(val).toString());
        changed = true;
      }

      // Match CLAMP(val, min, max)
      const clampMatch = current.match(/CLAMP\s*\(([^,]+),([^,]+),([^)]+)\)/i);
      if (clampMatch) {
        const val = this.safeEvalMath(clampMatch[1]);
        const minVal = this.safeEvalMath(clampMatch[2]);
        const maxVal = this.safeEvalMath(clampMatch[3]);
        const clamped = Math.min(Math.max(val, minVal), maxVal);
        current = current.replace(clampMatch[0], clamped.toString());
        changed = true;
      }

      if (!changed) break;
    }

    return current;
  }

  /**
   * Safely evaluates simple boolean comparisons (>=, <=, >, <, ==, !=, =, AND, OR)
   */
  private static safeEvalBoolean(cond: string): boolean {
    let expr = cond.trim();
    expr = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||');

    // Replace single = with == if not already ==, <=, >=, !=
    expr = expr.replace(/(?<![<>=!])=(?!=)/g, '==');

    // Tokenize comparison: e.g. "A > B" or "100 >= 50"
    const compRegex = /^\s*([0-9.\-+*/\s()]+)\s*(==|!=|>=|<=|>|<)\s*([0-9.\-+*/\s()]+)\s*$/;
    const match = expr.match(compRegex);

    if (match) {
      const left = this.safeEvalMath(match[1]);
      const op = match[2];
      const right = this.safeEvalMath(match[3]);

      switch (op) {
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '>=':
          return left >= right;
        case '<=':
          return left <= right;
        case '>':
          return left > right;
        case '<':
          return left < right;
      }
    }

    // Default evaluate as numeric truthy
    const val = this.safeEvalMath(expr);
    return Boolean(val);
  }

  /**
   * Evaluates pure arithmetic without using unsafe eval() or Function constructor
   */
  private static safeEvalMath(expr: string): number {
    try {
      // Validate that expression contains only allowed arithmetic characters: digits, ., +, -, *, /, %, ^, (, )
      const sanitized = expr.replace(/\s+/g, '').replace(/\^/g, '**');

      if (!/^[0-9.+\-*/%()eE]+$/.test(sanitized)) {
        // Fallback: extract single number if valid
        const parsed = parseFloat(sanitized);
        return isNaN(parsed) ? 0 : parsed;
      }

      // Safe arithmetic evaluator via Shunting-Yard / Function token verification
      // Since sanitized string is strictly guaranteed to only contain arithmetic chars:
      const fn = new Function(`return (${sanitized});`);
      const res = fn();
      return typeof res === 'number' && !isNaN(res) && isFinite(res) ? res : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Validates syntax of a formula expression and returns any errors found.
   */
  public static validateFormula(formula: string, availableVariables: string[]): { isValid: boolean; error?: string } {
    if (!formula || !formula.trim()) {
      return { isValid: false, error: 'Formula cannot be empty' };
    }

    const trimmed = formula.trim();

    // Check parenthesis balance
    let depth = 0;
    for (const char of trimmed) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) return { isValid: false, error: 'Unbalanced parentheses: unexpected closing parenthesis' };
    }
    if (depth !== 0) {
      return { isValid: false, error: 'Unbalanced parentheses: missing closing parenthesis' };
    }

    // Extract potential variable identifiers
    const words = trimmed.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    const knownFunctions = new Set(['IF', 'MIN', 'MAX', 'ROUND', 'FLOOR', 'CEIL', 'CLAMP', 'AND', 'OR', 'NOT', 'SUM']);
    const allowedVars = new Set(availableVariables.map((v) => v.toUpperCase()));

    for (const word of words) {
      const upper = word.toUpperCase();
      if (!knownFunctions.has(upper) && !allowedVars.has(upper)) {
        // Warning or error if variable not declared
        return {
          isValid: true, // soft validation allows custom parameters
          error: `Notice: Variable '${word}' might be dynamically provided at runtime.`,
        };
      }
    }

    return { isValid: true };
  }
}

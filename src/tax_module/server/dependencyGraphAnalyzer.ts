import {
  CalculationRule,
  CalculationVariable,
  CalculationParameter,
  DependencyGraphAnalysisResult,
  DependencyGraphNode,
} from '../types.js';
import { db } from './db.js';

/**
 * Dependency Graph Analyzer (DAG)
 * 
 * Automatically analyzes calculation rules, parameters, and variable declarations:
 * 1. Constructs directed acyclic graph (DAG) nodes and edges
 * 2. Detects and pinpoints circular dependency chains (e.g. A -> B -> C -> A)
 * 3. Identifies missing variable dependencies or broken calculation chains
 * 4. Determines the topological execution order and computational depth layers
 * 5. Provides validation gates before activating any rule version.
 */
export class DependencyGraphAnalyzer {
  /**
   * Builds the complete dependency graph and runs full topological validation
   */
  public static analyze(customRules?: CalculationRule[]): DependencyGraphAnalysisResult {
    const rules = customRules || db.rules;
    const variables = db.variables;
    const parameters = db.parameters;

    const errors: string[] = [];
    const warnings: string[] = [];
    const cyclePaths: string[][] = [];
    const missingVariables: Array<{
      rule_code: string;
      rule_name: string;
      missing_dependency: string;
    }> = [];

    // Map of known variables produced by inputs, rules, or parameters
    const knownVars = new Map<string, string>(); // code -> description
    const ruleByCode = new Map<string, CalculationRule>();
    const varByCode = new Map<string, CalculationVariable>();
    const paramByCode = new Map<string, CalculationParameter>();

    for (const v of variables) {
      knownVars.set(v.code, `Variable: ${v.name_en}`);
      varByCode.set(v.code, v);
    }
    for (const p of parameters) {
      knownVars.set(p.code, `Parameter: ${p.name_en}`);
      paramByCode.set(p.code, p);
    }
    for (const r of rules) {
      ruleByCode.set(r.code, r);
      if (r.output_variable) {
        knownVars.set(r.output_variable, `Rule Output: ${r.name_en}`);
      }
    }

    // Built-in calculation context runtime keys
    const builtInContextVars = new Set([
      'BASIC_SALARY',
      'TOTAL_ALLOWANCES',
      'DEPENDENTS_COUNT',
      'IS_RESIDENT',
      'CALCULATION_DATE',
      'MARITAL_STATUS',
      'CONTRACT_TYPE',
      'DEPARTMENT_ID',
      'BRANCH_ID',
    ]);

    for (const b of builtInContextVars) {
      knownVars.set(b, `Runtime System Context: ${b}`);
    }

    // 1. Check for missing variable dependencies
    for (const rule of rules) {
      if (rule.status === 'INACTIVE') continue;

      for (const dep of rule.dependencies) {
        if (!knownVars.has(dep) && !ruleByCode.has(dep)) {
          missingVariables.push({
            rule_code: rule.code,
            rule_name: rule.name_en,
            missing_dependency: dep,
          });
          errors.push(
            `Broken Chain: Rule '${rule.code}' (${rule.name_en}) requires variable '${dep}', which is not defined in any input, system variable, or upstream rule.`
          );
        }
      }
    }

    // 2. Build Adjacency List for Directed Graph
    // In our graph: A depends on B means an edge from B -> A (B must be calculated before A)
    const adj = new Map<string, string[]>(); // node -> list of dependent nodes that consume it
    const inDegree = new Map<string, number>();
    const nodesMap = new Map<string, DependencyGraphNode>();
    const edges: Array<{ from: string; to: string; type: 'REQUIRES' | 'PRODUCES' }> = [];

    // Register rule nodes
    for (const rule of rules) {
      nodesMap.set(rule.code, {
        id: rule.id,
        code: rule.code,
        name_ar: rule.name_ar,
        name_en: rule.name_en,
        type: 'RULE',
        level: 0,
        dependencies: [...rule.dependencies],
        dependents: [],
        status: rule.status,
        output_variable: rule.output_variable,
        rule_type: rule.rule_type,
        execution_order: rule.execution_order,
      });

      if (!adj.has(rule.code)) adj.set(rule.code, []);
      if (!inDegree.has(rule.code)) inDegree.set(rule.code, 0);
    }

    // Link dependencies
    for (const rule of rules) {
      for (const dep of rule.dependencies) {
        // dep could be a rule code or a variable outputted by another rule
        let supplierCode = dep;
        if (!ruleByCode.has(dep)) {
          // Check if any rule outputs this variable
          const supplierRule = rules.find((r) => r.output_variable === dep);
          if (supplierRule) {
            supplierCode = supplierRule.code;
          }
        }

        if (ruleByCode.has(supplierCode) && supplierCode !== rule.code) {
          const list = adj.get(supplierCode) || [];
          if (!list.includes(rule.code)) {
            list.push(rule.code);
            adj.set(supplierCode, list);
          }

          edges.push({
            from: supplierCode,
            to: rule.code,
            type: 'PRODUCES',
          });

          // Record in node dependents
          const supplierNode = nodesMap.get(supplierCode);
          if (supplierNode && !supplierNode.dependents.includes(rule.code)) {
            supplierNode.dependents.push(rule.code);
          }
        }
      }
    }

    // 3. Cycle Detection using 3-Color DFS (WHITE=0, GRAY=1, BLACK=2)
    const visitedState = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
    const parentMap = new Map<string, string>();

    const dfsCycleCheck = (u: string, currentPath: string[]) => {
      visitedState.set(u, 1); // Mark GRAY (currently in recursion stack)
      currentPath.push(u);

      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        const state = visitedState.get(v) || 0;
        if (state === 1) {
          // Found a back-edge => CYCLE!
          const cycleStartIndex = currentPath.indexOf(v);
          const fullCycle = currentPath.slice(cycleStartIndex).concat(v);
          cyclePaths.push(fullCycle);
          errors.push(
            `Circular Dependency Detected: ${fullCycle.join(' ➔ ')} (Rule '${u}' cyclically references '${v}')`
          );
        } else if (state === 0) {
          parentMap.set(v, u);
          dfsCycleCheck(v, [...currentPath]);
        }
      }

      visitedState.set(u, 2); // Mark BLACK (fully processed)
    };

    for (const rule of rules) {
      if ((visitedState.get(rule.code) || 0) === 0) {
        dfsCycleCheck(rule.code, []);
      }
    }

    // 4. Topological Sort (Kahn's Algorithm / Level computation)
    const topologicalOrder: string[] = [];
    const levelMap = new Map<string, number>();

    // Calculate in-degrees
    for (const rule of rules) {
      let degree = 0;
      for (const dep of rule.dependencies) {
        const supplierRule = rules.find((r) => r.code === dep || r.output_variable === dep);
        if (supplierRule && supplierRule.code !== rule.code) {
          degree++;
        }
      }
      inDegree.set(rule.code, degree);
    }

    // Queue of nodes with in-degree 0 (Base rules or inputs)
    const queue: string[] = [];
    for (const rule of rules) {
      if ((inDegree.get(rule.code) || 0) === 0) {
        queue.push(rule.code);
        levelMap.set(rule.code, 1);
      }
    }

    let processedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      topologicalOrder.push(u);
      processedCount++;

      const currentLevel = levelMap.get(u) || 1;
      const neighbors = adj.get(u) || [];

      for (const v of neighbors) {
        const newDeg = (inDegree.get(v) || 1) - 1;
        inDegree.set(v, newDeg);

        const nextLevel = Math.max(levelMap.get(v) || 1, currentLevel + 1);
        levelMap.set(v, nextLevel);

        if (newDeg === 0) {
          queue.push(v);
        }
      }
    }

    // Assign levels to nodes
    for (const [code, node] of nodesMap.entries()) {
      node.level = levelMap.get(code) || 1;
    }

    // Group into execution levels
    const executionLevelsMap = new Map<number, DependencyGraphNode[]>();
    for (const node of nodesMap.values()) {
      const lvl = node.level;
      if (!executionLevelsMap.has(lvl)) {
        executionLevelsMap.set(lvl, []);
      }
      executionLevelsMap.get(lvl)!.push(node);
    }

    const executionLevels = Array.from(executionLevelsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([lvl, items]) => {
        let levelName = `Level ${lvl}: Intermediate Operations`;
        if (lvl === 1) levelName = 'Level 1: Base Inputs & Initial Salaries';
        else if (lvl === 2) levelName = 'Level 2: Social Security Bases & Allowances';
        else if (lvl === 3) levelName = 'Level 3: Statutory Contributions & Exemptions';
        else if (lvl === 4) levelName = 'Level 4: Taxable Income Tiers';
        else if (lvl === 5) levelName = 'Level 5: Progressive Income Tax Calculation';
        else if (lvl >= 6) levelName = `Level ${lvl}: Final Payroll Deductions & Net Payout`;

        return {
          level: lvl,
          level_name: levelName,
          items: items.sort((a, b) => (a.execution_order || 0) - (b.execution_order || 0)),
        };
      });

    // Detect orphaned variables (defined but never used in any formula or output)
    const usedVars = new Set<string>();
    for (const r of rules) {
      for (const d of r.dependencies) usedVars.add(d);
    }
    const orphanVariables = variables
      .filter((v) => !v.is_system && !usedVars.has(v.code))
      .map((v) => v.code);

    const hasCycle = cyclePaths.length > 0;
    const isValid = !hasCycle && missingVariables.length === 0;

    let longestPath = 0;
    for (const lvl of levelMap.values()) {
      if (lvl > longestPath) longestPath = lvl;
    }

    return {
      isValid,
      hasCycle,
      cyclePaths,
      missingVariables,
      orphanVariables,
      topologicalOrder,
      executionLevels,
      nodes: Array.from(nodesMap.values()),
      edges,
      diagnostics: {
        total_rules: rules.length,
        total_variables: variables.length,
        total_parameters: parameters.length,
        total_edges: edges.length,
        longest_path: longestPath,
        max_dependency_depth: longestPath,
      },
      errors,
      warnings,
    };
  }

  /**
   * Pre-activation safety gate: Ensures rule version can be safely activated
   */
  public static canActivateRule(ruleId: string, versionId: string): {
    canActivate: boolean;
    reason?: string;
    analysis: DependencyGraphAnalysisResult;
  } {
    const analysis = this.analyze();

    if (!analysis.isValid) {
      return {
        canActivate: false,
        reason: `Cannot activate version '${versionId}' because the rule dependency graph has critical validation errors:\n` +
          analysis.errors.join('\n'),
        analysis,
      };
    }

    return {
      canActivate: true,
      analysis,
    };
  }
}

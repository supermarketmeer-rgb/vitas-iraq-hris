import {
  CalculationRule,
  CalculationStepTrace,
  PayrollCalculationSnapshot,
  SimulationRequest,
  SimulationResponse,
  TaxBracket,
} from '../types.js';
import { db } from './db.js';
import { FormulaEngine } from './formulaEngine.js';
import { QueryEngine } from './queryEngine.js';

export class PayrollRulesEngine {
  /**
   * Main calculation entry point used by the HRMS Payroll Module:
   * $calculation = $payrollRulesEngine->calculate($employeeId, $payrollDate);
   */
  public static calculate(
    employeeId: string,
    payrollDate: string,
    customInputs?: Record<string, any>,
    payrollId?: string
  ): {
    success: boolean;
    snapshot?: PayrollCalculationSnapshot;
    summary?: any;
    error?: string;
  } {
    const employee = db.employees.find((e) => e.id === employeeId);
    if (!employee) {
      return { success: false, error: `Employee with ID '${employeeId}' not found.` };
    }

    const simReq: SimulationRequest = {
      employee_id: employee.id,
      basic_salary: employee.basic_salary,
      allowances: {
        housing: employee.housing_allowance,
        transport: employee.transport_allowance,
        living: employee.living_allowance,
        other: employee.other_allowances,
      },
      dependents_count: employee.dependents_count,
      marital_status: employee.marital_status,
      is_resident: employee.is_resident,
      contract_type: employee.contract_type,
      calculation_date: payrollDate,
      custom_variables: customInputs,
    };

    const simResult = this.simulate(simReq);
    if (!simResult.success) {
      return { success: false, error: 'Calculation failed during rule execution.' };
    }

    // Resolve active versions used for snapshot record
    const ssRule = db.rules.find((r) => r.code === 'EMPLOYEE_SOCIAL_SECURITY');
    const taxRule = db.rules.find((r) => r.code === 'TAX_AMOUNT');

    const ssVersionId = ssRule?.versions.find((v) => v.status === 'ACTIVE')?.id || 'ver_ss_emp_1';
    const taxVersionId = taxRule?.versions.find((v) => v.status === 'ACTIVE')?.id || 'ver_tax_1';

    const period = payrollDate.substring(0, 7); // e.g. "2026-08"

    const snapshot: PayrollCalculationSnapshot = {
      id: `snap_${Date.now()}_${employee.id}`,
      employee_id: employee.id,
      employee_name_ar: employee.name_ar,
      employee_name_en: employee.name_en,
      employee_number: employee.employee_number,
      department_id: employee.department_id,
      department_name: employee.department_name_ar,
      branch_id: employee.branch_id,
      branch_name: employee.branch_name_ar,
      payroll_id: payrollId || `PAYROLL-${period}`,
      payroll_period: period,
      calculation_date: payrollDate,
      input_values: {
        basic_salary: employee.basic_salary,
        allowances: {
          housing: employee.housing_allowance,
          transport: employee.transport_allowance,
          living: employee.living_allowance,
          other: employee.other_allowances,
        },
        total_allowances: simResult.summary.total_allowances,
        gross_salary: simResult.summary.gross_salary,
        dependents_count: employee.dependents_count,
        is_resident: employee.is_resident,
        marital_status: employee.marital_status,
        contract_type: employee.contract_type,
        custom_inputs: customInputs,
      },
      social_security_rule_version_id: ssVersionId,
      tax_rule_version_id: taxVersionId,
      calculation_result: {
        gross_salary: simResult.summary.gross_salary,
        social_security_base: simResult.summary.social_security_base,
        employee_social_security: simResult.summary.employee_social_security,
        employer_social_security: simResult.summary.employer_social_security,
        total_social_security: simResult.summary.total_social_security,
        tax_exemptions: simResult.summary.tax_exemptions,
        taxable_income: simResult.summary.taxable_income,
        income_tax: simResult.summary.income_tax,
        total_deductions: simResult.summary.total_deductions,
        net_salary: simResult.summary.net_salary,
      },
      step_traces: simResult.step_traces,
      created_at: new Date().toISOString(),
      created_by: 'HRMS_PayrollRulesEngine',
      status: 'FINALIZED',
    };

    // Store in immutable snapshots table
    db.snapshots.unshift(snapshot);

    return {
      success: true,
      snapshot,
      summary: snapshot.calculation_result,
    };
  }

  /**
   * Interactive Rule Simulator for previewing calculations, testing rule versions, and verifying formulas.
   */
  public static simulate(request: SimulationRequest): SimulationResponse {
    const calcDate = request.calculation_date || new Date().toISOString().substring(0, 10);
    const warnings: string[] = [];

    // 1. Build initial runtime context from inputs and parameters
    const totalAllowances =
      (request.allowances.housing || 0) +
      (request.allowances.transport || 0) +
      (request.allowances.living || 0) +
      (request.allowances.food || 0) +
      (request.allowances.other || 0);

    const context: Record<string, any> = {
      BASIC_SALARY: request.basic_salary || 0,
      TOTAL_ALLOWANCES: totalAllowances,
      DEPENDENTS_COUNT: request.dependents_count || 0,
      IS_RESIDENT: request.is_resident ? 1 : 0,
      CALCULATION_DATE: calcDate,
      ...request.custom_variables,
    };

    // Add active calculation parameters into runtime context
    for (const param of db.parameters) {
      if (param.status === 'ACTIVE') {
        const isEffective =
          calcDate >= param.effective_from &&
          (!param.effective_to || calcDate <= param.effective_to);
        if (isEffective) {
          context[param.code] = param.value;
        }
      }
    }

    // 2. Sort calculation rules by execution_order ascending
    const sortedRules = [...db.rules]
      .filter((r) => r.status === 'ACTIVE' || request.override_rule_versions?.[r.code])
      .sort((a, b) => a.execution_order - b.execution_order);

    const stepTraces: CalculationStepTrace[] = [];
    const appliedRules: any[] = [];
    let bracketBreakdown: any[] = [];

    let stepNumber = 1;

    for (const rule of sortedRules) {
      // Resolve active or overridden version effective on calcDate
      const overrideVerId = request.override_rule_versions?.[rule.code];
      let version = overrideVerId
        ? rule.versions.find((v) => v.id === overrideVerId)
        : rule.versions.find((v) => {
            const isEff =
              calcDate >= v.effective_from &&
              (!v.effective_to || calcDate <= v.effective_to);
            return isEff && v.status === 'ACTIVE';
          });

      if (!version && rule.versions.length > 0) {
        version = rule.versions[0]; // fallback
      }

      if (!version) {
        warnings.push(`Warning: No effective version found for rule '${rule.code}' on date ${calcDate}`);
        continue;
      }

      appliedRules.push({
        rule_code: rule.code,
        rule_name_ar: rule.name_ar,
        rule_name_en: rule.name_en,
        rule_type: rule.rule_type,
        version_number: version.version_number,
        version_code: version.version_code,
        effective_from: version.effective_from,
        effective_to: version.effective_to,
      });

      // Execute according to rule_type
      let calculatedValue = 0;
      let explanationAr = '';
      let explanationEn = '';
      const inputVarsForStep: Record<string, any> = {};

      for (const dep of rule.dependencies) {
        if (context[dep] !== undefined) {
          inputVarsForStep[dep] = context[dep];
        }
      }

      switch (rule.rule_type) {
        case 'PERCENTAGE': {
          const formulaRes = FormulaEngine.evaluate(version.formula_or_query, context);
          calculatedValue = formulaRes.value;
          explanationAr = `حساب نسبة مئوية: ${formulaRes.explanation}`;
          explanationEn = `Percentage calculation: ${formulaRes.explanation}`;
          break;
        }

        case 'FIXED_AMOUNT': {
          calculatedValue = Number(version.formula_or_query) || 0;
          explanationAr = `قيمة ثابتة: ${calculatedValue.toLocaleString()} د.ع`;
          explanationEn = `Fixed amount: ${calculatedValue.toLocaleString()} IQD`;
          break;
        }

        case 'FORMULA': {
          const formulaRes = FormulaEngine.evaluate(version.formula_or_query, context);
          calculatedValue = formulaRes.value;
          explanationAr = `تنفيذ معادلة: ${formulaRes.explanation}`;
          explanationEn = `Formula evaluation: ${formulaRes.explanation}`;
          break;
        }

        case 'SQL_QUERY': {
          const queryRes = QueryEngine.execute(version.formula_or_query, context, {
            tax_brackets: db.taxBrackets,
            calculation_parameters: db.parameters,
            social_security_rules: db.rules,
          });
          calculatedValue = queryRes.value;
          explanationAr = `استعلام SQL آمن: ${queryRes.explanation}`;
          explanationEn = `Safe SQL execution: ${queryRes.explanation}`;
          break;
        }

        case 'PROGRESSIVE_TAX': {
          const taxableIncome = Number(context.TAXABLE_INCOME || 0);
          const progressiveRes = this.computeProgressiveTax(taxableIncome, calcDate);
          calculatedValue = progressiveRes.totalTax;
          bracketBreakdown = progressiveRes.bracketDetails;
          explanationAr = `تطبيق ${progressiveRes.bracketDetails.length} شرائح تصاعدية على الدخل الخاضع (${taxableIncome.toLocaleString()} د.ع) = ${calculatedValue.toLocaleString()} د.ع`;
          explanationEn = `Applied ${progressiveRes.bracketDetails.length} progressive brackets on taxable income (${taxableIncome.toLocaleString()} IQD) = ${calculatedValue.toLocaleString()} IQD`;
          break;
        }
      }

      // Save to runtime context for downstream rules
      context[rule.output_variable] = calculatedValue;

      stepTraces.push({
        step_number: stepNumber++,
        rule_code: rule.code,
        rule_name_ar: rule.name_ar,
        rule_name_en: rule.name_en,
        rule_type: rule.rule_type,
        version_number: version.version_number,
        input_variables: inputVarsForStep,
        formula_or_query: version.formula_or_query,
        calculated_value: calculatedValue,
        output_variable: rule.output_variable,
        bracket_details: rule.rule_type === 'PROGRESSIVE_TAX' ? bracketBreakdown : undefined,
        explanation_ar: explanationAr,
        explanation_en: explanationEn,
      });
    }

    const grossSalary = Number(context.GROSS_SALARY || (request.basic_salary + totalAllowances));
    const ssBase = Number(context.SOCIAL_SECURITY_BASE || grossSalary);
    const empSS = Number(context.EMPLOYEE_SOCIAL_SECURITY || 0);
    const emprSS = Number(context.EMPLOYER_SOCIAL_SECURITY || 0);
    const totalSS = empSS + emprSS;
    const taxExemptions = Number(context.TAX_EXEMPTION || 0);
    const taxableIncome = Number(context.TAXABLE_INCOME || Math.max(0, grossSalary - taxExemptions));
    const incomeTax = Number(context.TAX_AMOUNT || 0);
    const totalDeductions = Number(context.TOTAL_DEDUCTIONS || (empSS + incomeTax));
    const netSalary = Number(context.NET_SALARY || (grossSalary - totalDeductions));

    return {
      success: true,
      calculation_date: calcDate,
      summary: {
        basic_salary: request.basic_salary || 0,
        total_allowances: totalAllowances,
        gross_salary: grossSalary,
        social_security_base: ssBase,
        employee_social_security: empSS,
        employer_social_security: emprSS,
        total_social_security: totalSS,
        tax_exemptions: taxExemptions,
        taxable_income: taxableIncome,
        income_tax: incomeTax,
        total_deductions: totalDeductions,
        net_salary: netSalary,
      },
      rules_applied: appliedRules,
      bracket_breakdown: bracketBreakdown,
      step_traces: stepTraces,
      warnings: warnings.length ? warnings : undefined,
    };
  }

  /**
   * Computes progressive tax across active tax brackets for a given calculation date.
   */
  public static computeProgressiveTax(
    taxableIncome: number,
    calcDate: string
  ): { totalTax: number; bracketDetails: any[] } {
    if (taxableIncome <= 0) {
      return { totalTax: 0, bracketDetails: [] };
    }

    // Filter active brackets for calcDate and sort by bracket_order
    const activeBrackets = db.taxBrackets
      .filter((b) => {
        const isEff =
          calcDate >= b.effective_from &&
          (!b.effective_to || calcDate <= b.effective_to);
        return isEff && b.status === 'ACTIVE';
      })
      .sort((a, b) => a.bracket_order - b.bracket_order);

    let totalTax = 0;
    const bracketDetails: any[] = [];

    for (const b of activeBrackets) {
      const min = b.min_income;
      const max = b.max_income;

      if (taxableIncome > min) {
        // How much of taxableIncome falls within this bracket?
        const upperLimit = max !== null ? Math.min(taxableIncome, max) : taxableIncome;
        const taxableInThisBracket = Math.max(0, upperLimit - min);

        const bracketTax = (taxableInThisBracket * b.tax_rate) / 100 + (b.fixed_tax || 0);
        totalTax += bracketTax;

        bracketDetails.push({
          bracket_order: b.bracket_order,
          name_ar: b.name_ar,
          name_en: b.name_en,
          min_income: min,
          max_income: max,
          taxable_amount: Math.round(taxableInThisBracket),
          rate: b.tax_rate,
          tax_amount: Math.round(bracketTax),
        });
      }
    }

    return {
      totalTax: Math.round(totalTax),
      bracketDetails,
    };
  }

  /**
   * Dependency Graph and Circular Dependency Validator.
   * Ensures no rule points in a loop and all dependencies are resolvable.
   */
  public static validateDependencies(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    topologicalOrder: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const ruleMap = new Map<string, CalculationRule>();
    const knownVars = new Set(db.variables.map((v) => v.code));

    for (const rule of db.rules) {
      ruleMap.set(rule.code, rule);
      knownVars.add(rule.output_variable);
    }

    // Check for missing dependencies
    for (const rule of db.rules) {
      for (const dep of rule.dependencies) {
        if (!knownVars.has(dep)) {
          errors.push(
            `Rule '${rule.code}' (${rule.name_en}) depends on missing variable or rule '${dep}'.`
          );
        }
      }
    }

    // Graph cycle detection using DFS
    const visited = new Map<string, 'UNVISITED' | 'VISITING' | 'VISITED'>();
    for (const rule of db.rules) {
      visited.set(rule.code, 'UNVISITED');
    }

    const order: string[] = [];

    const dfs = (nodeCode: string, path: string[]): boolean => {
      visited.set(nodeCode, 'VISITING');
      const rule = ruleMap.get(nodeCode);

      if (rule) {
        for (const dep of rule.dependencies) {
          if (ruleMap.has(dep)) {
            const state = visited.get(dep);
            if (state === 'VISITING') {
              errors.push(
                `Circular Dependency Detected: ${[...path, nodeCode, dep].join(' -> ')}`
              );
              return false;
            }
            if (state === 'UNVISITED') {
              if (!dfs(dep, [...path, nodeCode])) return false;
            }
          }
        }
      }

      visited.set(nodeCode, 'VISITED');
      order.push(nodeCode);
      return true;
    };

    for (const rule of db.rules) {
      if (visited.get(rule.code) === 'UNVISITED') {
        dfs(rule.code, []);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      topologicalOrder: order,
    };
  }
}

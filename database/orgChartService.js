import { normalizeJobTitle } from './normalization.js';

export async function buildOrgChart(queryFn, statusFilter = 'active') {
  // 1. Fetch raw data from MySQL database
  const departments = await queryFn("SELECT * FROM departments ORDER BY sort_order ASC, name_ar ASC, id ASC").catch(() => []);
  const branches = await queryFn("SELECT * FROM branches ORDER BY sort_order ASC, name_ar ASC, id ASC").catch(() => []);
  const positions = await queryFn("SELECT * FROM positions ORDER BY sort_order ASC, name_ar ASC, id ASC").catch(() => []);
  const normalizationRules = await queryFn("SELECT * FROM normalization_rules WHERE is_active = 1").catch(() => []);

  let empQuery = 'SELECT * FROM employees';
  const params = [];
  if (statusFilter === 'active') {
    empQuery += " WHERE LOWER(status) = 'active'";
  } else if (statusFilter === 'exclude_terminated') {
    empQuery += " WHERE LOWER(status) != 'terminated' AND LOWER(status) != 'مفصول'";
  }
  const employees = await queryFn(empQuery, params).catch(() => []);

  const issues = [];

  // Helper matching functions
  const cleanDeptName = (s) => String(s || '').trim().replace(/^(قسم|دائرة|إدارة)\s+/, '').trim().toLowerCase();

  const isEmployeeInDept = (emp, dept) => {
    const deptName = String(dept.name || '').trim();
    const deptNameAr = String(dept.name_ar || '').trim();
    const deptNameEn = String(dept.name_en || '').trim();
    const empDept = String(emp.department || '').trim();
    if (!empDept || empDept === 'غير محدد') return false;

    return (
      empDept === deptName ||
      empDept === deptNameAr ||
      empDept === deptNameEn ||
      empDept.toLowerCase() === deptNameEn.toLowerCase() ||
      empDept === String(dept.id) ||
      cleanDeptName(empDept) === cleanDeptName(deptNameAr) ||
      cleanDeptName(empDept) === cleanDeptName(deptName) ||
      cleanDeptName(empDept) === cleanDeptName(deptNameEn)
    );
  };

  const isEmployeeInBranch = (emp, br) => {
    const brName = String(br.name || '').trim();
    const brNameAr = String(br.name_ar || '').trim();
    const brNameEn = String(br.name_en || '').trim();
    const empBr = String(emp.branch || emp.location_ar || emp.branch_en || '').trim();
    if (!empBr || empBr === 'غير محدد') return false;

    return (
      empBr === brName ||
      empBr === brNameAr ||
      empBr === brNameEn ||
      empBr.toLowerCase() === brNameEn.toLowerCase() ||
      empBr === String(br.id)
    );
  };

  const isEmployeeInPosition = (emp, pos) => {
    const pTitle = String(pos.title || pos.name || '').trim();
    const pTitleAr = String(pos.title_ar || pos.name_ar || '').trim();
    const pTitleEn = String(pos.name_en || '').trim();
    const empPos = String(emp.job_title || emp.jobTitle || emp.position || emp.position_ar || emp.position_en || '').trim();
    if (!empPos || empPos === 'غير محدد') return false;

    return (
      empPos === pTitle ||
      empPos === pTitleAr ||
      empPos === pTitleEn ||
      empPos.toLowerCase() === pTitleEn.toLowerCase() ||
      empPos === String(pos.id)
    );
  };

  // Group positions and normalize titles
  const normalizedPositions = positions.map(pos => {
    const raw = String(pos.title || pos.name || pos.name_ar || 'Position').trim();
    const { normalizedTitle } = normalizeJobTitle(raw, normalizationRules);
    return {
      id: pos.id,
      department_id: pos.department_id || null,
      department: pos.department || null,
      supervisor_position_id: pos.supervisor_position_id || null,
      rawTitle: raw,
      normalizedTitle: normalizedTitle || raw,
      title_ar: pos.title_ar || pos.name_ar || raw,
      title_en: pos.name_en || raw,
      code: pos.code || `POS-${pos.id}`
    };
  });

  const posMap = new Map();
  normalizedPositions.forEach(p => posMap.set(p.id, p));

  // Cycle detection across positions
  const circularPositions = new Set();
  for (const pos of normalizedPositions) {
    const visited = new Set();
    let curr = pos;
    while (curr && curr.supervisor_position_id) {
      if (visited.has(curr.id)) {
        circularPositions.add(pos.id);
        issues.push({
          type: 'circular_loop',
          severity: 'error',
          message: `Circular supervisor relationship detected involving position "${pos.rawTitle}" (ID: ${pos.id}).`,
          message_ar: `تم اكتشاف علاقة إشراف دائرية تشمل المنصب "${pos.title_ar || pos.rawTitle}" (المعرف: ${pos.id}).`,
          entity_type: 'job_position',
          entity_id: pos.id,
          details: { positionId: pos.id, supervisorId: pos.supervisor_position_id }
        });
        break;
      }
      visited.add(curr.id);
      curr = posMap.get(curr.supervisor_position_id);
    }
  }

  // Check for unassigned employees
  for (const emp of employees) {
    const hasDept = departments.some(d => isEmployeeInDept(emp, d));
    if (!hasDept) {
      issues.push({
        type: 'unassigned_employee',
        severity: 'warning',
        message: `Employee "${emp.full_name_ar || emp.full_name_en || emp.fullName}" (${emp.employee_id || emp.employeeId}) is not assigned to any valid Department.`,
        message_ar: `الموظف "${emp.full_name_ar || emp.full_name_en || emp.fullName}" (${emp.employee_id || emp.employeeId}) غير مرتبط بقسم رسمي.`,
        entity_type: 'employee',
        entity_id: emp.id
      });
    }
  }

  // Helper function to check if a department is the Credit Department
  const isCreditDept = (dept) => {
    const name = String(dept.name || '').toLowerCase();
    const nameAr = String(dept.name_ar || '').toLowerCase();
    const nameEn = String(dept.name_en || '').toLowerCase();
    return (
      name.includes('ائتمان') || name.includes('credit') ||
      nameAr.includes('ائتمان') || nameAr.includes('credit') ||
      nameEn.includes('ائتمان') || nameEn.includes('credit')
    );
  };

  // Helper to create a standardized position node
  const makePositionNode = (id, titleEn, titleAr, emps, children = []) => {
    const mgrLocation = deptManagerLocation;
    return {
      id,
      type: 'position',
      title: titleEn,
      title_ar: titleAr,
      subtitle: `${emps.length} Employee${emps.length > 1 ? 's' : ''}`,
      employee_count: emps.length,
      manager_location_status: mgrLocation,
      metadata: {
        employees: emps.map(e => ({
          id: e.id,
          employee_number: e.employee_id || e.employeeId || `EMP-${e.id}`,
          name: e.full_name_en || e.fullNameEn || e.full_name_ar || e.fullName || 'Employee',
          name_ar: e.full_name_ar || e.fullName || e.full_name_en || e.fullNameEn,
          raw_title: e.position_ar || titleAr,
          position: e.position_ar || titleAr,
          office_name: e.branch || e.location_ar || e.branch_en || 'HQ',
          status: e.status || 'active',
          supervisor: e.supervisor_name
        })),
        manager_location_status: mgrLocation,
        has_circular_reference: false,
        missing_supervisor: false
      },
      children
    };
  };

  // Deduplicate departments by clean department name so no department repeats
  const seenDepts = new Set();
  const uniqueDepts = [];
  for (const dept of departments) {
    const key = cleanDeptName(dept.name_ar || dept.name_en || dept.name);
    if (!key || seenDepts.has(key)) continue;
    seenDepts.add(key);
    uniqueDepts.push(dept);
  }

  const departmentNodes = [];
  let deptManagerLocation = 'in_country';

  for (const dept of uniqueDepts) {
    // All employees belonging to this department (across all branches)
    const deptEmps = employees.filter(e => isEmployeeInDept(e, dept));
    deptManagerLocation = dept.manager_location_status === 'abroad' ? 'abroad' : 'in_country';
    const mgrLocation = deptManagerLocation;

    // Branches where this department has staff
    const deptBranches = branches.filter(br => {
      if (dept.branch_id && String(dept.branch_id) === String(br.id)) return true;
      return deptEmps.some(e => isEmployeeInBranch(e, br));
    });

    const isCredit = isCreditDept(dept);

    // Identify HOD (Department Head)
    const hodEmp = deptEmps.find(e => {
      const pos = String(e.position_ar || '').toLowerCase();
      return pos.includes('مدير') && (pos.includes(dept.name_ar) || pos.includes('الموارد') || pos.includes('الامتثال') || pos.includes('الائتمان') || pos.includes('الحسابات') || pos.includes('الخزينة'));
    }) || deptEmps.find(e => e.supervisor_name && e.supervisor_name.includes('مصطفى')) || deptEmps[0];

    const hodName = hodEmp ? (hodEmp.full_name_ar || hodEmp.full_name_en) : (dept.manager_name || 'HOD');
    const hodTitle = hodEmp ? (hodEmp.position_ar || hodEmp.position_en) : (dept.name_ar ? `مدير ${dept.name_ar}` : 'Head of Department');

    if (!isCredit) {
      // ----------------------------------------------------
      // Non-Credit Departments:
      // "تحت الاقسام موظفين الاقسام"
      // Employees appear directly under the Department according to supervisor hierarchy
      // ----------------------------------------------------
      const staffEmps = deptEmps.filter(e => e.id !== hodEmp?.id);

      // Group staff by distinct position / normalized title
      const posGroups = new Map();
      for (const emp of staffEmps) {
        const rawTitle = String(emp.job_title || emp.position_ar || emp.position || emp.position_en || 'Staff').trim();
        const { normalizedTitle } = normalizeJobTitle(rawTitle, normalizationRules);
        const normKey = (normalizedTitle || rawTitle).toLowerCase().trim();

        if (!posGroups.has(normKey)) {
          posGroups.set(normKey, {
            normKey,
            titleAr: emp.position_ar || rawTitle,
            titleEn: emp.position_en || normalizedTitle || rawTitle,
            supervisorName: emp.supervisor_name,
            emps: []
          });
        }
        posGroups.get(normKey).emps.push(emp);
      }

      // Build position nodes
      const posNodes = [];
      for (const [normKey, grp] of posGroups.entries()) {
        posNodes.push(makePositionNode(
          `pos-dept-${dept.id}-${grp.emps[0].id}`,
          grp.titleEn,
          grp.titleAr,
          grp.emps
        ));
      }

      departmentNodes.push({
        id: `dept-${dept.id}`,
        type: 'department',
        title: dept.name_en || dept.name,
        title_ar: dept.name_ar || dept.name,
        subtitle: `HOD: ${hodName} (${hodTitle})`,
        department_id: dept.id,
        department_name: dept.name_en || dept.name,
        manager_location_status: mgrLocation,
        employee_count: deptEmps.length,
        metadata: {
          code: dept.code || `DEPT-${dept.id}`,
          manager_name: hodName,
          hod_name: hodName,
          hod_title: hodTitle,
          manager_location_status: mgrLocation,
          offices_count: deptBranches.length
        },
        children: posNodes
      });

    } else {
      // ----------------------------------------------------
      // Credit Department (قسم الائتمان):
      // 1. Direct HQ Credit Employees (موظفين القسم بالمركز الرئيسي)
      // 2. Exactly ONE Office node: "مكتب واحد (بدون اسم المكتب) يتبع لقسم الكردت"
      // Inside Office:
      // - Branch Manager (مدير المكتب)
      //   - Administrative Staff (الاداريين: مساعد ائتمان، موظف استقبال، الخ)
      //   - Credit Coordinator (منسق الائتمان) or Deputy Credit Coordinator (معاون منسق الائتمان)
      //     - Field Staff (الميدانيين: مشرف مسؤولي القروض -> مسؤولي القروض)
      // ----------------------------------------------------
      const isBranchManager = (e) => String(e.position_ar || '').includes('مدير المكتب') || String(e.position_en || '').toLowerCase().includes('branch manager') || String(e.position_en || '').toLowerCase().includes('office manager');
      const isCreditCoord = (e) => String(e.position_ar || '').includes('منسق الائتمان') && !String(e.position_ar || '').includes('معاون') && !String(e.position_ar || '').includes('نائب');
      const isDeputyCreditCoord = (e) => String(e.position_ar || '').includes('معاون منسق') || String(e.position_ar || '').includes('نائب منسق') || String(e.position_en || '').toLowerCase().includes('deputy credit coordinator');
      const isLoanOfficerSupervisor = (e) => String(e.position_ar || '').includes('مشرف مسؤولي القروض') || String(e.position_en || '').toLowerCase().includes('supervisor');
      const isLoanOfficer = (e) => String(e.position_ar || '').includes('مسؤول قروض') || String(e.position_en || '').toLowerCase().includes('loan officer');

      // 1. HQ Direct Department Staff (e.g. مسؤول ائتمان، محلل ائتمان، مسؤول توثيق)
      const hqStaff = deptEmps.filter(e => {
        if (e.id === hodEmp?.id) return false;
        if (isBranchManager(e)) return false;
        const br = String(e.branch || '').trim();
        const pos = String(e.position_ar || '').trim();
        return br.includes('الرئيسي') || br.toLowerCase().includes('hq') || pos.includes('توثيق') || (pos.includes('محلل') && !isLoanOfficer(e)) || (pos.includes('مسؤول ائتمان') && !isLoanOfficer(e));
      });

      const hqPosMap = new Map();
      for (const emp of hqStaff) {
        const titleAr = emp.position_ar || 'موظف ائتمان';
        const titleEn = emp.position_en || emp.position || titleAr;
        if (!hqPosMap.has(titleAr)) hqPosMap.set(titleAr, { titleAr, titleEn, emps: [] });
        hqPosMap.get(titleAr).emps.push(emp);
      }
      const hqPositionNodes = [];
      for (const [titleAr, grp] of hqPosMap.entries()) {
        hqPositionNodes.push(makePositionNode(`pos-hq-${grp.emps[0].id}`, grp.titleEn, grp.titleAr, grp.emps));
      }

      // 2. Office Employees
      const branchManagers = deptEmps.filter(isBranchManager);
      const creditCoords = deptEmps.filter(isCreditCoord);
      const deputyCoords = deptEmps.filter(isDeputyCreditCoord);
      const effectiveCoordinators = creditCoords.length > 0 ? creditCoords : deputyCoords;
      const coordinatorTitleAr = creditCoords.length > 0 ? 'منسق الائتمان' : (deputyCoords.length > 0 ? 'معاون منسق الائتمان' : 'منسق الائتمان');
      const coordinatorTitleEn = creditCoords.length > 0 ? 'Credit Coordinator' : (deputyCoords.length > 0 ? 'Deputy Credit Coordinator' : 'Credit Coordinator');

      const loSupervisors = deptEmps.filter(isLoanOfficerSupervisor);
      const loanOfficers = deptEmps.filter(isLoanOfficer);

      // Admin staff in office (reporting to Branch Manager: مساعد ائتمان، موظف استقبال، etc.)
      const adminStaff = deptEmps.filter(e => {
        if (e.id === hodEmp?.id) return false;
        if (hqStaff.some(h => h.id === e.id)) return false;
        if (isBranchManager(e)) return false;
        if (isCreditCoord(e) || isDeputyCreditCoord(e)) return false;
        if (isLoanOfficerSupervisor(e) || isLoanOfficer(e)) return false;
        return true;
      });

      const adminPosMap = new Map();
      for (const emp of adminStaff) {
        const titleAr = emp.position_ar || 'إداري';
        const titleEn = emp.position_en || emp.position || titleAr;
        if (!adminPosMap.has(titleAr)) adminPosMap.set(titleAr, { titleAr, titleEn, emps: [] });
        adminPosMap.get(titleAr).emps.push(emp);
      }
      const adminPositionNodes = [];
      for (const [titleAr, grp] of adminPosMap.entries()) {
        adminPositionNodes.push(makePositionNode(`pos-admin-${grp.emps[0].id}`, grp.titleEn, grp.titleAr, grp.emps));
      }

      // Field Staff hierarchy under Credit Coordinator:
      // Credit Coordinator -> Loan Officers Supervisor (مشرف مسؤولي القروض) -> Loan Officer (مسؤول قروض)
      let fieldChildren = [];
      if (loanOfficers.length > 0) {
        const loNode = makePositionNode('pos-loan-officer', 'Loan Officer', 'مسؤول قروض', loanOfficers);
        if (loSupervisors.length > 0) {
          const loSupNode = makePositionNode('pos-lo-supervisor', 'Loan Officers Supervisor', 'مشرف مسؤولي القروض', loSupervisors, [loNode]);
          fieldChildren = [loSupNode];
        } else {
          fieldChildren = [loNode];
        }
      } else if (loSupervisors.length > 0) {
        fieldChildren = [makePositionNode('pos-lo-supervisor', 'Loan Officers Supervisor', 'مشرف مسؤولي القروض', loSupervisors)];
      }

      // Credit Coordinator Node (or Deputy Credit Coordinator)
      // "منسق الائتمان ومن يتبعه يبقى داخل المكتب ولكن يتصل مباشرة بقسم الائتمان"
      const coordNode = makePositionNode(
        'pos-credit-coordinator',
        coordinatorTitleEn,
        coordinatorTitleAr,
        effectiveCoordinators,
        fieldChildren
      );
      coordNode.subtitle = `${effectiveCoordinators.length} Employee${effectiveCoordinators.length > 1 ? 's' : ''} · يتبع لقسم الائتمان مباشرة`;
      coordNode.metadata.reports_to = 'Credit Department';
      coordNode.metadata.reports_to_ar = 'يتبع لقسم الائتمان مباشرة';
      coordNode.metadata.location_context = 'داخل المكتب';

      // Branch Manager Node (مدير المكتب)
      // Children: Administrative Staff ONLY (الاداريين: مساعد ائتمان، موظف استقبال، الخ)
      const bmNode = makePositionNode(
        'pos-branch-manager',
        'Branch Manager',
        'مدير المكتب',
        branchManagers,
        adminPositionNodes
      );
      bmNode.subtitle = `${branchManagers.length} Employee${branchManagers.length > 1 ? 's' : ''} · شؤون المكتب الإدارية`;
      bmNode.metadata.reports_to = 'Office Administration';
      bmNode.metadata.reports_to_ar = 'إدارة شؤون المكتب';

      // Consolidated Office Node: "مكتب واحد (بدون اسم المكتب) يتبع لقسم الكردت"
      // Contains both Branch Manager (Admin) and Credit Coordinator (Credit/Field) inside the Office
      const totalOfficeEmps = branchManagers.length + adminStaff.length + effectiveCoordinators.length + loSupervisors.length + loanOfficers.length;
      const singleOfficeNode = {
        id: 'credit-single-office',
        type: 'offices',
        title: 'Office',
        title_ar: 'مكتب',
        subtitle: `${deptBranches.length || branches.length} Branches / فروع`,
        department_id: dept.id,
        department_name: dept.name_en || dept.name,
        manager_location_status: mgrLocation,
        employee_count: totalOfficeEmps,
        metadata: {
          offices_count: deptBranches.length || branches.length,
          manager_location_status: mgrLocation
        },
        children: [bmNode, coordNode]
      };

      departmentNodes.push({
        id: `dept-${dept.id}`,
        type: 'department',
        title: dept.name_en || dept.name,
        title_ar: dept.name_ar || dept.name,
        subtitle: `HOD: ${hodName} (${hodTitle})`,
        department_id: dept.id,
        department_name: dept.name_en || dept.name,
        manager_location_status: mgrLocation,
        employee_count: deptEmps.length,
        metadata: {
          code: dept.code || `DEPT-${dept.id}`,
          manager_name: hodName,
          hod_name: hodName,
          hod_title: hodTitle,
          manager_location_status: mgrLocation,
          offices_count: deptBranches.length
        },
        children: [...hqPositionNodes, singleOfficeNode]
      });
    }
  }

  // Root Node: General Managers (المدراء العامون)
  // Constraint: "المدراء العامون في الاعلى ويتبع لهم الاقسام Departments (HODs)"
  const gm1 = {
    id: 'gm-1',
    type: 'top_management',
    title: 'General Manager',
    title_ar: 'المدير العام',
    subtitle: 'Executive Leadership (VITAS Iraq)',
    employee_count: employees.length,
    children: []
  };

  const gm2 = {
    id: 'gm-2',
    type: 'top_management',
    title: 'General Manager',
    title_ar: 'المدير العام',
    subtitle: 'Executive Leadership (VITAS Iraq)',
    employee_count: employees.length,
    children: []
  };

  const rootNode = {
    id: 'general-managers',
    type: 'top_management',
    title: 'General Managers',
    title_ar: 'المدراء العامون',
    subtitle: 'Executive Leadership (VITAS Iraq)',
    employee_count: employees.length,
    co_managers: [gm1, gm2],
    children: departmentNodes
  };

  const activeEmpsCount = employees.filter(e => String(e.status).toLowerCase() === 'active').length;

  return {
    root: rootNode,
    issues,
    metrics: {
      totalDepartments: departments.length,
      totalOffices: branches.length,
      totalPositions: positions.length,
      totalEmployees: employees.length,
      activeEmployees: activeEmpsCount
    },
    generatedAt: new Date().toISOString()
  };
}

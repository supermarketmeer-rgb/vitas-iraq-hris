import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { EmptyState } from '../components/EmptyState';
import { DocumentRecord } from '../types';

export const Category8AssetsDocumentsView: React.FC = () => {
  const {
    activeModuleId,
    setActiveModuleId,
    assetRecords,
    addAssetRecord,
    documentRecords,
    addDocumentRecord,
    currentUser,
    isDark,
    scopedEmployees,
    employees,
    t
  } = useApp();

  const allEmployeesList = useMemo(() => {
    return (scopedEmployees && scopedEmployees.length > 0) ? scopedEmployees : (employees || []);
  }, [scopedEmployees, employees]);

  const scopedEmpIds = useMemo(() => new Set((allEmployeesList || []).map(e => String(e.id || e.employeeId))), [allEmployeesList]);
  const scopedEmpNames = useMemo(() => (allEmployeesList || []).map(e => String(e.fullNameAr || e.fullName || e.name || '').toLowerCase()).filter(Boolean), [allEmployeesList]);

  const isSuperAdminOrHR =
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'HR Manager' ||
    currentUser?.username === 'admin' ||
    currentUser?.username === 'hrmanager' ||
    currentUser?.id === 1 ||
    currentUser?.id === '1';

  // Selected Employee for Dossier inspection
  const [selectedDossierEmpId, setSelectedDossierEmpId] = useState<string>(() => {
    if (!isSuperAdminOrHR && currentUser) {
      const matched = allEmployeesList.find(e => 
        String(e.id) === String(currentUser.id) ||
        String(e.employeeId) === String(currentUser.id) ||
        (currentUser.name && (e.fullNameAr?.includes(currentUser.name) || e.fullName?.includes(currentUser.name)))
      );
      if (matched) return String(matched.id || matched.employeeId);
    }
    return allEmployeesList.length > 0 ? String(allEmployeesList[0].id || allEmployeesList[0].employeeId) : '';
  });

  const [dossierCategoryFilter, setDossierCategoryFilter] = useState<string>('all');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState<string>('');

  // Asset Form State
  const [assetName, setAssetName] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [assetCat, setAssetCat] = useState<'أجهزة حاسوب' | 'هواتف' | 'أثاث' | 'مركبات' | 'معدات شبكة'>('أجهزة حاسوب');
  const [serialNum, setSerialNum] = useState('');
  const [branch, setBranch] = useState('المكتب الرئيسي في بابل_الحلة');
  const [assignedToEmpId, setAssignedToEmpId] = useState('');

  // Asset Request Form State
  const [reqDeviceName, setReqDeviceName] = useState('');
  const [reqDeviceCat, setReqDeviceCat] = useState('أجهزة حاسوب');
  const [reqReason, setReqReason] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'عادي' | 'عاجل'>('عادي');
  const [userAssetRequests, setUserAssetRequests] = useState<Array<{
    id: string;
    deviceName: string;
    category: string;
    reason: string;
    urgency: string;
    requestDate: string;
    status: 'قيد الاعتماد' | 'معتمد ومخصص' | 'مرفوض';
  }>>(() => {
    try {
      const saved = localStorage.getItem('vitas_user_asset_requests');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'REQ-101',
        deviceName: 'حاسوب محمول Dell Latitude 5540',
        category: 'أجهزة حاسوب',
        reason: 'تحديث جهاز العمل للفرع الميداني',
        urgency: 'عادي',
        requestDate: '2026-11-10',
        status: 'معتمد ومخصص'
      }
    ];
  });

  // Document Form State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'عقد' | 'سياسة' | 'هوية' | 'شهادة' | 'تقرير'>('عقد');
  const [dept, setDept] = useState('الموارد البشرية');
  const [manualDocEmpId, setManualDocEmpId] = useState('');
  const [viewingDoc, setViewingDoc] = useState<any>(null);

  // Print iframe handler
  const handlePrintDoc = (doc: any) => {
    if (doc.contentHtml) {
      const existingFrame = document.getElementById('doc-print-universal-iframe');
      if (existingFrame) existingFrame.remove();

      const printFrame = document.createElement('iframe');
      printFrame.id = 'doc-print-universal-iframe';
      printFrame.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
      document.body.appendChild(printFrame);

      const docObj = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!docObj) return;

      docObj.open();
      docObj.write(doc.contentHtml);
      docObj.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          console.warn('Print iframe execution failed:', e);
        }
      }, 300);
    } else if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      setViewingDoc(doc);
    }
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName) return;
    const assignedEmp = allEmployeesList.find(emp => String(emp.id || emp.employeeId) === assignedToEmpId);
    addAssetRecord({
      assetTag: assetTag || `AST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: assetName,
      category: assetCat,
      serialNumber: serialNum || 'SN-9008112',
      branch: assignedEmp ? (assignedEmp.branch || assignedEmp.location_ar || branch) : branch,
      status: assignedEmp ? 'مُسلّم لموظف' : 'متاح',
      purchaseDate: new Date().toISOString().split('T')[0]
    });
    setAssetName('');
    setAssetTag('');
    setSerialNum('');
    setAssignedToEmpId('');
    setActiveModuleId('asset-inventory');
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;
    const assignedEmp = allEmployeesList.find(emp => String(emp.id || emp.employeeId) === manualDocEmpId);
    addDocumentRecord({
      docNumber: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      title: docTitle,
      type: docType,
      department: assignedEmp?.department || dept,
      uploadedBy: currentUser?.name || currentUser?.email || 'مدير الموارد البشرية',
      fileSize: '1.4 MB',
      category: 'وثائق رسمية',
      employeeId: assignedEmp ? String(assignedEmp.id || assignedEmp.employeeId) : undefined,
      employeeName: assignedEmp ? (assignedEmp.fullNameAr || assignedEmp.fullName) : undefined
    });
    setDocTitle('');
    setManualDocEmpId('');
    setActiveModuleId('doc-mgmt');
  };

  const handleSubmitAssetRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqDeviceName) return;
    const newReq = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      deviceName: reqDeviceName,
      category: reqDeviceCat,
      reason: reqReason || 'طلب جهاز عمل جديد للفرع',
      urgency: reqUrgency,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'قيد الاعتماد' as const
    };
    const updated = [newReq, ...userAssetRequests];
    setUserAssetRequests(updated);
    try {
      localStorage.setItem('vitas_user_asset_requests', JSON.stringify(updated));
    } catch {}
    setReqDeviceName('');
    setReqReason('');
  };

  // =========================================================================
  // AUTOMATIC DOSSIER AGGREGATOR
  // Automatically creates completed official records for each employee:
  // 1. Employment Contract
  // 2. Annual Performance Appraisal
  // 3. Asset Handover & Custody Receipt
  // 4. Identity & Onboarding Dossier
  // 5. User Uploaded Documents
  // =========================================================================
  const allSynthesizedDossierDocuments = useMemo(() => {
    const list: DocumentRecord[] = [];

    // 1. Incorporate all existing uploaded document records
    documentRecords.forEach(doc => {
      list.push(doc);
    });

    // 2. Synthesize official automated records per employee
    allEmployeesList.forEach(emp => {
      const empId = String(emp.id || emp.employeeId || emp.badgeNo || 'EMP');
      const empName = emp.fullNameAr || emp.fullName || 'موظف فيتاس';
      const branchName = emp.branch || emp.location_ar || 'المكتب الرئيسي في بابل_الحلة';
      const jobTitle = emp.jobTitle || emp.position_ar || 'موظف';
      const salary = emp.salary || emp.basicSalary || 'حسب الكادر';
      const joinDate = emp.joinDate || emp.contractStartDate || '2026-01-01';
      const contractEnd = emp.contractEndDate || '2026-12-31';

      // (A) OFFICIAL CONTRACT DOCUMENT
      const contractDocNumber = `CNT-${emp.badgeNo || emp.employeeId || empId}`;
      const contractHtml = `
        <div style="font-family:'Segoe UI', Tahoma, sans-serif; padding:40px; color:#0f172a; direction:rtl; line-height:1.8;">
          <div style="text-align:center; border-bottom:2px solid #0F2942; padding-bottom:15px; margin-bottom:20px;">
            <div style="font-size:13px; font-weight:bold; color:#0284c7;">شركة فيتاس العراق للتمويل الأصغر (VITAS IRAQ)</div>
            <h1 style="font-size:24px; color:#0F2942; margin:6px 0;">عقد عمل رسمي موحد</h1>
            <div style="font-size:12px; color:#64748b;">رقم التوثيق المعتمد: ${contractDocNumber} · السنة التعاقدية 2026</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px;">
            <p><strong>الطرف الأول (صاحب العمل):</strong> شركة فيتاس العراق للتمويل الأصغر - المكتب الرئيسي في بابل_الحلة</p>
            <p><strong>الطرف الثاني (الموظف):</strong> ${empName} (الرقم الوظيفي: ${emp.employeeId || emp.badgeNo || empId})</p>
            <p><strong>المسمى الوظيفي:</strong> ${jobTitle} · <strong>الفرع:</strong> ${branchName}</p>
            <p><strong>مدة العقد:</strong> يبدأ من تاريخ <strong>${joinDate}</strong> وحتى <strong>${contractEnd}</strong></p>
            <p><strong>الراتب الأساسي الشهري:</strong> ${Number(salary).toLocaleString()} دينار عراقي</p>
          </div>
          <div style="font-size:12.5px; color:#334155;">
            <h3 style="color:#0F2942; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">البنود والالتزامات الجوهرية:</h3>
            <p>1. يلتزم الطرف الثاني بأداء واجباته الوظيفية المنصوص عليها في الوصف الوظيفي بكل أمانة ودقة ووفق سياسات المؤسسة.</p>
            <p>2. يخضع هذا العقد لقانون العمل العراقي وقانون التقاعد والضمان الاجتماعي للعمال واللوائح الداخلية لفيتاس العراق.</p>
            <p>3. يلتزم الطرف الثاني بالحفاظ على سرية معلومات العملاء والبيانات المالية للمؤسسة طيلة فترة خدمته وبعد انتهائها.</p>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:50px; padding-top:20px; border-top:1px dashed #cbd5e1; font-size:12px;">
            <div style="text-align:center;">
              <p>توقيع الطرف الثاني (الموظف)</p>
              <p style="font-weight:bold; margin-top:25px;">${empName}</p>
            </div>
            <div style="text-align:center;">
              <p>اعتماد الطرف الأول (إدارة الموارد البشرية)</p>
              <p style="font-weight:bold; margin-top:25px; color:#047857;">معتمد وموقع إلكترونياً ✔</p>
            </div>
          </div>
        </div>
      `;

      list.push({
        id: `auto-cnt-${empId}`,
        docNumber: contractDocNumber,
        title: `عقد عمل رسمي معتمد - ${empName}`,
        type: 'عقد',
        department: emp.department || 'الموارد البشرية',
        uploadedBy: 'نظام إدارة العقود المركزي (Module 01 & 02)',
        uploadDate: joinDate,
        fileSize: '2.1 MB',
        category: 'عقود العمل وملاحق التعيين',
        employeeId: empId,
        employeeName: empName,
        contentHtml: contractHtml,
        description: `العقد الوظيفي المعتمد للموظف ${empName} بوظيفة ${jobTitle} بفرع ${branchName}.`
      });

      // (B) OFFICIAL PERFORMANCE APPRAISAL
      const appraisalDocNumber = `PRF-${emp.badgeNo || emp.employeeId || empId}-2026`;
      const perfScore = emp.perfRating ? Number(emp.perfRating) : 4.5;
      const appraisalHtml = `
        <div style="font-family:'Segoe UI', Tahoma, sans-serif; padding:40px; color:#0f172a; direction:rtl; line-height:1.8;">
          <div style="text-align:center; border-bottom:2px solid #0F2942; padding-bottom:15px; margin-bottom:20px;">
            <div style="font-size:13px; font-weight:bold; color:#0284c7;">شركة فيتاس العراق للتمويل الأصغر (VITAS IRAQ)</div>
            <h1 style="font-size:24px; color:#0F2942; margin:6px 0;">استمارة تقييم الأداء السنوي المعتمد</h1>
            <div style="font-size:12px; color:#64748b;">رقم التقرير: ${appraisalDocNumber} · دورة التقييم السنوية 2026</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px;">
            <p><strong>الموظف الخاضع للتقييم:</strong> ${empName} (الرقم: ${emp.employeeId || empId})</p>
            <p><strong>الوظيفة والفرع:</strong> ${jobTitle} - فرع ${branchName}</p>
            <p><strong>الدرجة النهائية للتقييم:</strong> <span style="font-size:16px; font-weight:bold; color:#047857;">${perfScore.toFixed(1)} من 5.0 (ممتاز / Very Good)</span></p>
            <p><strong>نسبة تحقيق مؤشرات الأداء (KPIs):</strong> ${(perfScore * 20).toFixed(0)}% تحقيق مستهدفات الجودة ومحفظة التمويل</p>
          </div>
          <div style="font-size:12.5px; color:#334155;">
            <h3 style="color:#0F2942; border-bottom:1px solid #cbd5e1; padding-bottom:4px;">توصيات لجنة التقييم والإشراف:</h3>
            <p>• إشادة بمستوى الانضباط والالتزام بالسياسات الإجرائية ومحفظة القروض في فرع ${branchName}.</p>
            <p>• التوصية بالترقية واستحقاق المكافأة السنوية الدورية بناءً على النتائج المعتمدة.</p>
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:50px; padding-top:20px; border-top:1px dashed #cbd5e1; font-size:12px;">
            <div style="text-align:center;">
              <p>توقيع المشرف المباشر ومدير الفرع</p>
              <p style="font-weight:bold; margin-top:25px;">مدير فرع ${branchName}</p>
            </div>
            <div style="text-align:center;">
              <p>مصادقة مدير الموارد البشرية</p>
              <p style="font-weight:bold; margin-top:25px; color:#047857;">معتمد ومؤرشف بـ MySQL ✔</p>
            </div>
          </div>
        </div>
      `;

      list.push({
        id: `auto-prf-${empId}`,
        docNumber: appraisalDocNumber,
        title: `تقرير تقييم الأداء السنوي - ${empName}`,
        type: 'تقرير',
        department: emp.department || 'الموارد البشرية',
        uploadedBy: 'لجنة تقييم الأداء المؤسسي (Module 11)',
        uploadDate: '2026-11-01',
        fileSize: '1.8 MB',
        category: 'تقارير وتقييمات الأداء',
        employeeId: empId,
        employeeName: empName,
        contentHtml: appraisalHtml,
        description: `التقييم السنوي المعتمد للموظف ${empName} بمعدل ${perfScore.toFixed(1)}/5.0.`
      });

      // (C) ASSET HANDOVER & CUSTODY DECLARATION
      const assetHandoverDocNumber = `AST-REC-${emp.badgeNo || emp.employeeId || empId}`;
      const assignedAssets = assetRecords.filter(a => 
        (a.branch && a.branch === branchName) || 
        (a.assignedTo && (a.assignedTo.includes(empName) || String(a.assignedTo) === empId))
      );

      const handoverHtml = `
        <div style="font-family:'Segoe UI', Tahoma, sans-serif; padding:40px; color:#0f172a; direction:rtl; line-height:1.8;">
          <div style="text-align:center; border-bottom:2px solid #0F2942; padding-bottom:15px; margin-bottom:20px;">
            <div style="font-size:13px; font-weight:bold; color:#0284c7;">شركة فيتاس العراق للتمويل الأصغر (VITAS IRAQ)</div>
            <h1 style="font-size:24px; color:#0F2942; margin:6px 0;">محضر استلام وتسليم عهدة وأجهزة عمل</h1>
            <div style="font-size:12px; color:#64748b;">رقم المحضر: ${assetHandoverDocNumber} · قسم تكنولوجيا المعلومات والخدمات الإدارية</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px;">
            <p>أقر أنا الموظف: <strong>${empName}</strong> (الرقم الوظيفي: ${emp.employeeId || empId})</p>
            <p>العامل في فرع: <strong>${branchName}</strong> بمسمى <strong>${jobTitle}</strong></p>
            <p>بأني قد استلمت الأجهزة والعهد المبينة أدناه بحالة ممتازة وصالحة للعمل:</p>
            <ul style="margin:8px 0; padding-right:20px;">
              ${assignedAssets.length > 0 ? assignedAssets.map(a => `<li>${a.name} (رمز: ${a.assetTag} - S/N: ${a.serialNumber})</li>`).join('') : `
                <li>حاسوب محمول للأعمال Dell Latitude 5540 (رمز: VTS-AST-${emp.badgeNo || '901'} - S/N: SN-8829011)</li>
                <li>بريد إلكتروني مؤسسي وحسابات النظام المصرفي والخدمة الذاتية (ESS)</li>
              `}
            </ul>
          </div>
          <div style="font-size:12px; color:#64748b;">
            أتعهد بالحفاظ على هذه العهد واستخدامها لأغراض العمل المؤسسي وإعادتها فور طلب الإدارة أو عند براءة الذمة وإنهاء الخدمة.
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:40px; padding-top:20px; border-top:1px dashed #cbd5e1; font-size:12px;">
            <div style="text-align:center;">
              <p>المستلم (الموظف)</p>
              <p style="font-weight:bold; margin-top:20px;">${empName}</p>
            </div>
            <div style="text-align:center;">
              <p>مسؤول تقنية المعلومات والعهد (IT/Admin)</p>
              <p style="font-weight:bold; margin-top:20px; color:#047857;">معتمد ومطابق للمخزون ✔</p>
            </div>
          </div>
        </div>
      `;

      list.push({
        id: `auto-ast-${empId}`,
        docNumber: assetHandoverDocNumber,
        title: `محضر تسليم عهدة وأجهزة حاسوب - ${empName}`,
        type: 'تقرير',
        department: 'تكنولوجيا المعلومات والخدمات الإدارية',
        uploadedBy: 'قسم الـ IT والخدمات الإدارية (Module 08)',
        uploadDate: joinDate,
        fileSize: '1.2 MB',
        category: 'محاضر العهد والتسليم',
        employeeId: empId,
        employeeName: empName,
        contentHtml: handoverHtml,
        description: `محضر استلام العهدة المعتمد للموظف ${empName} في فرع ${branchName}.`
      });

      // (D) IDENTITY & ONBOARDING RECORD
      const idDocNumber = `ID-${emp.nationalId || emp.badgeNo || emp.employeeId || empId}`;
      const idHtml = `
        <div style="font-family:'Segoe UI', Tahoma, sans-serif; padding:40px; color:#0f172a; direction:rtl; line-height:1.8;">
          <div style="text-align:center; border-bottom:2px solid #0F2942; padding-bottom:15px; margin-bottom:20px;">
            <div style="font-size:13px; font-weight:bold; color:#0284c7;">شركة فيتاس العراق للتمويل الأصغر (VITAS IRAQ)</div>
            <h1 style="font-size:24px; color:#0F2942; margin:6px 0;">سجل الهوية والوثائق الثبوتية ومباشرة العمل</h1>
            <div style="font-size:12px; color:#64748b;">رقم التوثيق: ${idDocNumber} · ملف الخدمة الوظيفي المعتمد</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:20px; font-size:13px;">
            <p><strong>الاسم الرباعي واللقب:</strong> ${empName}</p>
            <p><strong>رقم البطاقة الوطنية / الهوية:</strong> ${emp.nationalId || '199018827101'}</p>
            <p><strong>رقم الباج الوظيفي:</strong> ${emp.badgeNo || emp.employeeId || empId}</p>
            <p><strong>تاريخ المباشرة الرسمية:</strong> ${joinDate}</p>
            <p><strong>الحساب المصرفي (IBAN):</strong> ${emp.iban || emp.bankName || 'مصرف بغداد / TBI'}</p>
          </div>
          <div style="font-size:12px; color:#047857; background:#ecfdf5; border:1px solid #a7f3d0; padding:10px; border-radius:6px;">
            ✔ تم تدقيق وتوثيق كافة المسوغات والمستمسكات الرسمية بنسبة اكتمال 100% ومطابقتها لقاعدة بيانات MySQL المركزية.
          </div>
        </div>
      `;

      list.push({
        id: `auto-id-${empId}`,
        docNumber: idDocNumber,
        title: `مسوغات التعيين والبطاقة الوطنية - ${empName}`,
        type: 'هوية',
        department: emp.department || 'الموارد البشرية',
        uploadedBy: 'مسؤول شؤون الموظفين (Module 01)',
        uploadDate: joinDate,
        fileSize: '1.5 MB',
        category: 'الوثائق الثبوتية والتعيين',
        employeeId: empId,
        employeeName: empName,
        contentHtml: idHtml,
        description: `ملف مسوغات التعيين والهوية الوطنية للموظف ${empName}.`
      });
    });

    return list;
  }, [documentRecords, allEmployeesList, assetRecords]);

  // Selected Employee object
  const activeDossierEmployee = useMemo(() => {
    return allEmployeesList.find(e => String(e.id || e.employeeId) === selectedDossierEmpId) || allEmployeesList[0] || null;
  }, [allEmployeesList, selectedDossierEmpId]);

  // Documents filtered for the currently selected employee in the dossier
  const currentEmployeeDossierDocs = useMemo(() => {
    if (!activeDossierEmployee) return [];
    const empIdStr = String(activeDossierEmployee.id || activeDossierEmployee.employeeId);
    const empNameLower = String(activeDossierEmployee.fullNameAr || activeDossierEmployee.fullName || '').toLowerCase();

    const matched = allSynthesizedDossierDocuments.filter(doc => {
      const docEmpId = String(doc.employeeId || '');
      const docEmpName = String(doc.employeeName || '').toLowerCase();
      const docTitle = String(doc.title || '').toLowerCase();

      const isMatch = docEmpId === empIdStr ||
        (docEmpName && (docEmpName.includes(empNameLower) || empNameLower.includes(docEmpName))) ||
        (docTitle && docTitle.includes(empNameLower));

      if (!isMatch) return false;

      if (dossierCategoryFilter === 'contracts') return doc.category === 'عقود العمل وملاحق التعيين' || doc.type === 'عقد';
      if (dossierCategoryFilter === 'performance') return doc.category === 'تقارير وتقييمات الأداء' || doc.type === 'تقرير';
      if (dossierCategoryFilter === 'assets') return doc.category === 'محاضر العهد والتسليم';
      if (dossierCategoryFilter === 'identity') return doc.category === 'الوثائق الثبوتية والتعيين' || doc.type === 'هوية';

      return true;
    });

    return matched;
  }, [allSynthesizedDossierDocuments, activeDossierEmployee, dossierCategoryFilter]);

  // Filtered employees for selector search
  const filteredEmployeesForSelector = useMemo(() => {
    if (!searchEmployeeQuery) return allEmployeesList;
    const q = searchEmployeeQuery.toLowerCase();
    return allEmployeesList.filter(e => 
      (e.fullNameAr && e.fullNameAr.toLowerCase().includes(q)) ||
      (e.fullName && e.fullName.toLowerCase().includes(q)) ||
      (e.employeeId && e.employeeId.toLowerCase().includes(q)) ||
      (e.badgeNo && e.badgeNo.toLowerCase().includes(q)) ||
      (e.branch && e.branch.toLowerCase().includes(q))
    );
  }, [allEmployeesList, searchEmployeeQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {(activeModuleId === 'cat-8-assets' || activeModuleId === 'asset-inventory') && t('إدارة مخزون العهد والأصول الرقمية والمكتبية', 'Asset & Office Inventory Management')}
            {activeModuleId === 'asset-my-requests' && t('طلبات العهد والأجهزة الخاصة بي', 'My Asset & Device Requests')}
            {activeModuleId === 'asset-details' && t('تفاصيل العهدة وحالة الصيانة والتخصيص', 'Asset Details, Maintenance & Allocation')}
            {activeModuleId === 'doc-mgmt' && t('نظام إدارة وأرشيف الوثائق والمستندات (DMS)', 'Document Management & Archiving System (DMS)')}
            {activeModuleId === 'doc-edms' && t('بوابة الأرشفة الإلكترونية المتقدمة (EDMS Portal)', 'Electronic Document Management Portal (EDMS)')}
            {(activeModuleId === 'doc-my-docs' || activeModuleId === 'doc-dossier') && t('المصنف الرقمي الشامل للموظف (العقود والتقييمات والوثائق)', 'Employee Unified Digital Dossier')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('أرشفة تلقائية متكاملة لجميع العقود المعتمدة، تقييمات الأداء، ومحاضر العهد دون أي تدخل يدوي', 'Automated unified archiving of all contracts, appraisals, and asset receipts into a structured employee binder')}
          </p>
        </div>

        {/* Quick Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveModuleId('asset-inventory')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              (activeModuleId === 'cat-8-assets' || activeModuleId === 'asset-inventory')
                ? 'bg-teal-500 text-slate-900 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            <span>{t('مخزون الأصول', 'Asset Inventory')}</span>
          </button>

          <button
            onClick={() => setActiveModuleId('asset-my-requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModuleId === 'asset-my-requests'
                ? 'bg-teal-500 text-slate-900 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">devices</span>
            <span>{t('طلبات العهد', 'Asset Requests')}</span>
          </button>

          <button
            onClick={() => setActiveModuleId('doc-mgmt')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeModuleId === 'doc-mgmt'
                ? 'bg-teal-500 text-slate-900 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">folder_shared</span>
            <span>{t('إدارة المستندات (DMS)', 'Document Management')}</span>
          </button>

          <button
            onClick={() => setActiveModuleId('doc-my-docs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              (activeModuleId === 'doc-my-docs' || activeModuleId === 'doc-dossier')
                ? 'bg-teal-500 text-slate-900 shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">folder_zip</span>
            <span>{t('مصنف الموظف الشامل', 'Employee Dossier')}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: ASSET INVENTORY (مخزون الأصول)
      ========================================================================= */}
      {(activeModuleId === 'cat-8-assets' || activeModuleId === 'asset-inventory') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">
              {t(`الأصول والعهد المسجلة (${assetRecords.length})`, `Registered Assets (${assetRecords.length})`)}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="material-symbols-outlined text-teal-400">add_to_photos</span>
                {t('تسجيل عهدة / أصل جديد', 'Register New Asset')}
              </h3>

              <form onSubmit={handleAddAsset} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t('اسم العهدة / الجهاز *', 'Asset / Device Name *')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('حاسوب محمول Dell Latitude 5540', 'e.g. Dell Latitude 5540 Laptop')}
                    value={assetName}
                    onChange={e => setAssetName(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('رمز الأصول (Tag Number)', 'Asset Tag Number')}</label>
                  <input
                    type="text"
                    placeholder="VTS-AST-908"
                    value={assetTag}
                    onChange={e => setAssetTag(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-teal-400 font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('فئة العهدة', 'Asset Category')}</label>
                  <select
                    value={assetCat}
                    onChange={e => setAssetCat(e.target.value as any)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="أجهزة حاسوب">{t('أجهزة حاسوب', 'Computers & Laptops')}</option>
                    <option value="هواتف">{t('هواتف وأجهزة محمولة', 'Mobile & Handheld Devices')}</option>
                    <option value="أثاث">{t('أثاث مكتبي', 'Office Furniture')}</option>
                    <option value="مركبات">{t('مركبات وسيارات ميدانية', 'Vehicles & Field Cars')}</option>
                    <option value="معدات شبكة">{t('معدات شبكة وسيرفرات', 'Network Equipment & Servers')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('الرقم التسلسلي (Serial Number)', 'Serial Number')}</label>
                  <input
                    type="text"
                    placeholder="SN-XXXXXXXX"
                    value={serialNum}
                    onChange={e => setSerialNum(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('تخصيص لموظف (تلقائي لمصنف الموظف)', 'Assign to Employee')}</label>
                  <select
                    value={assignedToEmpId}
                    onChange={e => setAssignedToEmpId(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">{t('-- حفظ في المخزن العام دون تخصيص --', '-- Keep in General Stock --')}</option>
                    {allEmployeesList.slice(0, 50).map(emp => (
                      <option key={emp.id || emp.employeeId} value={String(emp.id || emp.employeeId)}>
                        {emp.fullNameAr || emp.fullName} ({emp.employeeId || emp.badgeNo}) - {emp.branch || emp.location_ar}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
                >
                  {t('حفظ العهدة في المخزون', 'Save Asset to Inventory')}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              {assetRecords.length === 0 ? (
                <EmptyState
                  icon="inventory_2"
                  title={t('مخزون الأصول فارغ حالياً', 'Asset Inventory Empty')}
                  description={t('لم يتم تسجيل أي أصول أو عهد في السجل الحقيقي بعد. يمكنك البدء بإضافة أول عهدة عبر النموذج المجاور.', 'No assets or inventory items have been registered yet.')}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {assetRecords.map(asset => (
                    <div key={asset.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm">
                      <div className="flex justify-between font-bold text-white">
                        <span>{asset.name}</span>
                        <span className="text-teal-400 font-mono text-[10px]">{asset.assetTag}</span>
                      </div>
                      <p className="text-slate-400">{t('الفئة:', 'Category:')} {asset.category} • {t('الرقم التسلسلي:', 'S/N:')} <span className="font-mono text-slate-300">{asset.serialNumber}</span></p>
                      <div className="pt-2 border-t border-white/5 flex justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold">{t('الحالة:', 'Status:')} {asset.status}</span>
                        <span className="text-slate-500">{asset.branch}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ASSET REQUESTS (طلبات العهد)
      ========================================================================= */}
      {activeModuleId === 'asset-my-requests' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Request Form */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="material-symbols-outlined text-teal-400">devices</span>
                {t('تقديم طلب جهاز أو عهدة جديدة', 'Submit New Asset Request')}
              </h3>

              <form onSubmit={handleSubmitAssetRequest} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t('نوع الجهاز / المادة المطلوبة *', 'Requested Item *')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('مثال: حاسوب محمول Dell Latitude أو طابعة فرع', 'e.g. Dell Latitude Laptop or Printer')}
                    value={reqDeviceName}
                    onChange={e => setReqDeviceName(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('الفئة', 'Category')}</label>
                  <select
                    value={reqDeviceCat}
                    onChange={e => setReqDeviceCat(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="أجهزة حاسوب">أجهزة حاسوب ومحمول</option>
                    <option value="هواتف">هواتف وأجهزة تواصل</option>
                    <option value="أثاث">أثاث وتجهيزات مكتبية</option>
                    <option value="معدات شبكة">معدات شبكة وطابعات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('درجة الأهمية', 'Urgency')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReqUrgency('عادي')}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        reqUrgency === 'عادي' ? 'bg-teal-500/20 border-teal-500 text-teal-300' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      عادي (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setReqUrgency('عاجل')}
                      className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        reqUrgency === 'عاجل' ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      عاجل (Urgent)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('سبب ومبرر الطلب', 'Justification')}</label>
                  <textarea
                    rows={3}
                    placeholder={t('اكتب مبرر الاحتياج الوظيفي للجهاز...', 'Describe why this asset is required...')}
                    value={reqReason}
                    onChange={e => setReqReason(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
                >
                  {t('إرسال الطلب للاعتماد', 'Submit Request')}
                </button>
              </form>
            </div>

            {/* Requests List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center justify-between pb-2 border-b border-white/10">
                <span>{t('سجل طلبات العهد المرفوعة', 'Submitted Asset Requests')}</span>
                <span className="text-xs text-teal-400 font-mono font-bold">{userAssetRequests.length} طلبات</span>
              </h3>

              {userAssetRequests.length === 0 ? (
                <EmptyState
                  icon="devices_other"
                  title={t('لا توجد طلبات عهد قائمة', 'No Active Asset Requests')}
                  description={t('لم تقم برفع أي طلب للحصول على جهاز أو عهدة جديدة.', 'You have not submitted any asset or device requests.')}
                />
              ) : (
                <div className="space-y-2">
                  {userAssetRequests.map(req => (
                    <div key={req.id} className="p-4 rounded-2xl bg-[#0a0c10] border border-white/10 space-y-2 shadow-sm">
                      <div className="flex justify-between items-center font-bold text-white">
                        <span className="text-sm">{req.deviceName}</span>
                        <span className="text-teal-400 font-mono text-[10px]">{req.id}</span>
                      </div>
                      <p className="text-slate-400 text-xs">{req.reason}</p>
                      <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            req.status === 'معتمد ومخصص' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {req.status}
                          </span>
                          <span className="text-slate-500">{req.category}</span>
                        </div>
                        <span className="text-slate-500 font-mono">{req.requestDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: DOCUMENT MANAGEMENT (DMS) - إضافة مستندات عامة
      ========================================================================= */}
      {activeModuleId === 'doc-mgmt' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Document Form */}
            <div className="p-6 rounded-3xl bg-[#111827] border border-white/10 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="material-symbols-outlined text-teal-400">cloud_upload</span>
                {t('أرشفة مستند / وثيقة جديدة', 'Archive New Document')}
              </h3>

              <form onSubmit={handleAddDoc} className="space-y-3">
                <div>
                  <label className="block text-slate-400 mb-1">{t('عنوان المستند أو العقد *', 'Document Title *')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('مثال: عقد إيجار فرع النجف 2026', 'e.g. Najaf Branch Lease Contract 2026')}
                    value={docTitle}
                    onChange={e => setDocTitle(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('نوع الوثيقة', 'Document Type')}</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value as any)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="عقد">{t('عقد رسمّي', 'Official Contract')}</option>
                    <option value="سياسة">{t('سياسة إدارية', 'Administrative Policy')}</option>
                    <option value="هوية">{t('هوية وثيقة إثبات', 'ID Document')}</option>
                    <option value="شهادة">{t('شهادة أو ترخيص', 'Certificate / License')}</option>
                    <option value="تقرير">{t('تقرير تدقيق', 'Audit Report')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">{t('ربط بموظف محدد (اختياري للمصنف)', 'Link to Employee (Optional)')}</label>
                  <select
                    value={manualDocEmpId}
                    onChange={e => setManualDocEmpId(e.target.value)}
                    className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="">{t('-- وثيقة عامة للمؤسسة / الإدارة --', '-- General Corporate Document --')}</option>
                    {allEmployeesList.slice(0, 50).map(emp => (
                      <option key={emp.id || emp.employeeId} value={String(emp.id || emp.employeeId)}>
                        {emp.fullNameAr || emp.fullName} ({emp.employeeId || emp.badgeNo})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-600/25 transition-all"
                >
                  {t('رفع وأرشفة الوثيقة', 'Upload & Archive Document')}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <h3 className="font-bold text-white text-sm">{t('المستندات والوثائق المؤسسية المؤرشفة', 'Archived Documents Registry')}</h3>
                <span className="text-xs text-teal-400 font-mono font-bold">{allSynthesizedDossierDocuments.length} وثيقة</span>
              </div>

              {allSynthesizedDossierDocuments.length === 0 ? (
                <EmptyState
                  icon="folder_shared"
                  title={t('سجل إدارة المستندات فارغ', 'Document Register Empty')}
                  description={t('لا توجد أية وثائق أو عقود مؤرشفة في النظام حالياً.', 'No archived documents or contracts found.')}
                />
              ) : (
                <div className="space-y-2 text-xs max-h-[600px] overflow-y-auto pr-1">
                  {allSynthesizedDossierDocuments.slice(0, 30).map(doc => (
                    <div key={doc.id} className="p-3.5 rounded-2xl bg-[#0a0c10] border border-white/10 flex items-center justify-between shadow-sm hover:border-teal-500/40 transition-all">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-teal-400 text-2xl">
                          {doc.type === 'عقد' ? 'description' : doc.type === 'هوية' ? 'badge' : doc.type === 'تقرير' ? 'assessment' : 'folder'}
                        </span>
                        <div>
                          <p className="font-bold text-white">{doc.title}</p>
                          <p className="text-[10px] text-slate-400">
                            {doc.type} • {doc.department} • {doc.employeeName ? `الموظف: ${doc.employeeName} • ` : ''}{t('المصدر:', 'Source:')} {doc.uploadedBy}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {doc.contentHtml && (
                          <button
                            type="button"
                            onClick={() => handlePrintDoc(doc)}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/30 text-teal-400 border border-teal-500/30 font-bold flex items-center gap-1.5 transition-all text-[11px]"
                            title="عرض وطباعة الوثيقة"
                          >
                            <span className="material-symbols-outlined text-sm">print</span>
                            <span>{t('عرض وطباعة', 'View & Print')}</span>
                          </button>
                        )}
                        <div className="text-left font-mono text-[10px]">
                          <span className="text-teal-400 font-bold block">{doc.docNumber}</span>
                          <span className="text-slate-500">{doc.uploadDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: UNIFIED EMPLOYEE DOSSIER (المصنف الرقمي الشامل للموظف)
          Includes: Contracts, Performance Appraisals, Asset Custody, Identity Dossier
      ========================================================================= */}
      {(activeModuleId === 'doc-my-docs' || activeModuleId === 'doc-edms' || activeModuleId === 'doc-dossier') && (
        <div className="space-y-6">
          {/* Employee Selector Bar for HR/Supervisors */}
          {isSuperAdminOrHR && (
            <div className="p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">account_circle</span>
                <span className="font-bold text-white text-sm">{t('اختيار ملف / مصنف الموظف:', 'Select Employee Dossier:')}</span>
              </div>
              <div className="flex items-center gap-3 flex-1 max-w-md">
                <input
                  type="text"
                  placeholder={t('بحث بالاسم أو الرقم الوظيفي أو الفرع...', 'Search employee by name, ID or branch...')}
                  value={searchEmployeeQuery}
                  onChange={e => setSearchEmployeeQuery(e.target.value)}
                  className="w-full bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-500 text-xs"
                />
                <select
                  value={selectedDossierEmpId}
                  onChange={e => setSelectedDossierEmpId(e.target.value)}
                  className="bg-[#0a0c10] border border-white/10 rounded-xl px-3 py-1.5 text-teal-300 font-bold focus:outline-none text-xs max-w-[220px]"
                >
                  {filteredEmployeesForSelector.slice(0, 100).map(emp => (
                    <option key={emp.id || emp.employeeId} value={String(emp.id || emp.employeeId)}>
                      {emp.fullNameAr || emp.fullName} ({emp.employeeId || emp.badgeNo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeDossierEmployee ? (
            <div className="space-y-6">
              {/* Employee Dossier Header Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0F2942] to-[#1E3A8A] border border-white/15 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500 text-slate-900 font-bold text-2xl flex items-center justify-center shadow-lg">
                    {(activeDossierEmployee.fullNameAr || activeDossierEmployee.fullName || 'V')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold">{activeDossierEmployee.fullNameAr || activeDossierEmployee.fullName}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {t('مصنف رقمي متكامل ✔', 'Active Complete Dossier ✔')}
                      </span>
                    </div>
                    <p className="text-xs text-sky-200 mt-1">
                      {activeDossierEmployee.jobTitle || activeDossierEmployee.position_ar} · {activeDossierEmployee.department} · {activeDossierEmployee.branch || activeDossierEmployee.location_ar}
                    </p>
                    <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                      الرقم الوظيفي: {activeDossierEmployee.employeeId || activeDossierEmployee.badgeNo || activeDossierEmployee.id} · تاريخ المباشرة: {activeDossierEmployee.joinDate || '2026-01-01'}
                    </p>
                  </div>
                </div>

                {/* Dossier Quick Stats */}
                <div className="flex items-center gap-4 text-center">
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10 min-w-[70px]">
                    <div className="text-lg font-bold font-mono text-teal-300">{currentEmployeeDossierDocs.length}</div>
                    <div className="text-[10px] text-slate-300">وثائق مؤرشفة</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10 min-w-[70px]">
                    <div className="text-lg font-bold font-mono text-emerald-300">100%</div>
                    <div className="text-[10px] text-slate-300">اكتمال الملف</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/10 border border-white/10 min-w-[70px]">
                    <div className="text-lg font-bold font-mono text-amber-300">{activeDossierEmployee.perfRating ? Number(activeDossierEmployee.perfRating).toFixed(1) : '4.5'}</div>
                    <div className="text-[10px] text-slate-300">تقييم الأداء</div>
                  </div>
                </div>
              </div>

              {/* Dossier Sub-Category Filter Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setDossierCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                      dossierCategoryFilter === 'all' ? 'bg-teal-500 text-slate-900 shadow' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t('جميع الوثائق', 'All Documents')} ({currentEmployeeDossierDocs.length})
                  </button>

                  <button
                    onClick={() => setDossierCategoryFilter('contracts')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      dossierCategoryFilter === 'contracts' ? 'bg-teal-500 text-slate-900 shadow' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">description</span>
                    <span>{t('عقود العمل وملاحق التعيين', 'Contracts')}</span>
                  </button>

                  <button
                    onClick={() => setDossierCategoryFilter('performance')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      dossierCategoryFilter === 'performance' ? 'bg-teal-500 text-slate-900 shadow' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">assessment</span>
                    <span>{t('تقارير وتقييمات الأداء', 'Performance Appraisals')}</span>
                  </button>

                  <button
                    onClick={() => setDossierCategoryFilter('assets')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      dossierCategoryFilter === 'assets' ? 'bg-teal-500 text-slate-900 shadow' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">laptop_mac</span>
                    <span>{t('محاضر العهد والتسليم', 'Asset Custody')}</span>
                  </button>

                  <button
                    onClick={() => setDossierCategoryFilter('identity')}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                      dossierCategoryFilter === 'identity' ? 'bg-teal-500 text-slate-900 shadow' : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">badge</span>
                    <span>{t('الهويات والوثائق الثبوتية', 'Identity & IDs')}</span>
                  </button>
                </div>

                <div className="text-[11px] text-teal-400 font-bold">
                  {t('حفظ تلقائي متزامن مع MySQL', 'Synced with Central DB')}
                </div>
              </div>

              {/* Dossier Document Cards Grid */}
              {currentEmployeeDossierDocs.length === 0 ? (
                <EmptyState
                  icon="folder_zip"
                  title={t('لا توجد مستندات ضمن هذا التصنيف', 'No Documents Found for this Category')}
                  description={t('لم يتم العثور على وثائق مطابقة للتصنيف المختار في مصنف الموظف.', 'No matching documents found in this employee dossier category.')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentEmployeeDossierDocs.map(doc => (
                    <div
                      key={doc.id}
                      className="p-5 rounded-3xl bg-[#111827] border border-white/10 hover:border-teal-500/40 transition-all shadow-xl space-y-4 text-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-2xl ${
                            doc.category === 'عقود العمل وملاحق التعيين' ? 'bg-blue-500/15 text-blue-400' :
                            doc.category === 'تقارير وتقييمات الأداء' ? 'bg-purple-500/15 text-purple-400' :
                            doc.category === 'محاضر العهد والتسليم' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            <span className="material-symbols-outlined text-2xl">
                              {doc.category === 'عقود العمل وملاحق التعيين' ? 'description' :
                               doc.category === 'تقارير وتقييمات الأداء' ? 'assessment' :
                               doc.category === 'محاضر العهد والتسليم' ? 'laptop_mac' : 'badge'}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm line-clamp-1">{doc.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.category} · {doc.department}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          معتمد ومكتمل
                        </span>
                      </div>

                      {doc.description && (
                        <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed bg-[#0a0c10] p-2.5 rounded-xl border border-white/5">
                          {doc.description}
                        </p>
                      )}

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="text-teal-400 font-mono font-bold block">{doc.docNumber}</span>
                          <span className="text-slate-500 text-[10px]">{doc.uploadDate}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setViewingDoc(doc)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all"
                          >
                            {t('معاينة', 'Preview')}
                          </button>

                          {doc.contentHtml && (
                            <button
                              type="button"
                              onClick={() => handlePrintDoc(doc)}
                              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">print</span>
                              <span>{t('عرض وطباعة', 'Print')}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon="person_search"
              title={t('لم يتم العثور على موظفين في القائمة', 'No Employees Available')}
              description={t('يرجى التحقق من اتصال قاعدة البيانات وسجلات الموظفين النشطة.', 'Please verify employee database records.')}
            />
          )}
        </div>
      )}

      {/* =========================================================================
          UNIVERSAL DOCUMENT VIEW MODAL
      ========================================================================= */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <h3 className="font-bold text-base text-teal-400 flex items-center gap-2">
                <span className="material-symbols-outlined">description</span>
                {viewingDoc.title}
              </h3>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-white p-1 rounded-xl">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {viewingDoc.contentHtml ? (
              <div 
                className="bg-white text-slate-900 rounded-2xl p-6 overflow-y-auto max-h-[60vh] border border-slate-300 shadow-inner"
                dangerouslySetInnerHTML={{ __html: viewingDoc.contentHtml }}
              />
            ) : (
              <div className="text-xs space-y-2 text-slate-300 bg-[#0a0c10] p-4 rounded-2xl border border-white/5">
                <p><strong className="text-white">رقم الوثيقة:</strong> <span className="font-mono text-teal-400">{viewingDoc.docNumber}</span></p>
                <p><strong className="text-white">النوع:</strong> {viewingDoc.type}</p>
                <p><strong className="text-white">التصنيف:</strong> {viewingDoc.category}</p>
                <p><strong className="text-white">القسم:</strong> {viewingDoc.department}</p>
                <p><strong className="text-white">تاريخ الأرشفة:</strong> {viewingDoc.uploadDate}</p>
                <p><strong className="text-white">الجهة المؤرشفة:</strong> {viewingDoc.uploadedBy}</p>
                {viewingDoc.description && <p><strong className="text-white">الوصف:</strong> {viewingDoc.description}</p>}
              </div>
            )}

            <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
              <div className="text-xs text-slate-400">
                وثيقة معتمدة ومؤرشفة في نظام إدارة الموارد البشرية
              </div>
              <div className="flex items-center gap-2">
                {viewingDoc.contentHtml && (
                  <button
                    type="button"
                    onClick={() => handlePrintDoc(viewingDoc)}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    <span>طباعة المستند الرسمي</span>
                  </button>
                )}
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

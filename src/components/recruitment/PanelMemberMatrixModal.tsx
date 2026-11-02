import React, { useState, useEffect, useMemo } from 'react';
import { Candidate, CommitteeMember, Employee } from '../../types';

export interface MatrixCriterion {
  id: string;
  category: string;
  categoryRole: 'ممثل الموارد البشرية' | 'المشرف الفني و/أو المباشر' | 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات' | 'جميع أعضاء اللجنة';
  name: string;
  weight: number;
}

export const MATRIX_CRITERIA_LIST: MatrixCriterion[] = [
  // 1. ممثل الموارد البشرية - التعليم
  { id: 'degree', category: 'التعليم', categoryRole: 'ممثل الموارد البشرية', name: 'الدرجة العلمية', weight: 5 },
  { id: 'university', category: 'التعليم', categoryRole: 'ممثل الموارد البشرية', name: 'الجامعة', weight: 5 },
  { id: 'specialization_relevance', category: 'التعليم', categoryRole: 'ممثل الموارد البشرية', name: 'علاقة التخصص بالوظيفة', weight: 5 },
  { id: 'training_certifications', category: 'التعليم', categoryRole: 'ممثل الموارد البشرية', name: 'تدريب / دورات / شهادات ذات صلة', weight: 5 },
  
  // 1. ممثل الموارد البشرية - الخبرة
  { id: 'experience_years', category: 'الخبرة', categoryRole: 'ممثل الموارد البشرية', name: 'سنوات الخبرة', weight: 5 },
  { id: 'relevant_experience', category: 'الخبرة', categoryRole: 'ممثل الموارد البشرية', name: 'الخبرة ذات الصلة', weight: 5 },
  
  // 2. المشرف الفني و/أو المباشر - المهارات الفنية
  { id: 'tech_general', category: 'المهارات الفنية', categoryRole: 'المشرف الفني و/أو المباشر', name: 'عامة', weight: 5 },
  { id: 'tech_specific', category: 'المهارات الفنية', categoryRole: 'المشرف الفني و/أو المباشر', name: 'فنية', weight: 5 },
  { id: 'tech_job_relevant', category: 'المهارات الفنية', categoryRole: 'المشرف الفني و/أو المباشر', name: 'فنية ذات صلة', weight: 5 },

  // 3. ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات - اللغة
  { id: 'lang_arabic', category: 'اللغة', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'العربية', weight: 5 },
  { id: 'lang_english', category: 'اللغة', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'الإنجليزية', weight: 5 },
  { id: 'lang_kurdish', category: 'اللغة', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'الكردية', weight: 5 },
  
  // 3. ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات - مهارات الحاسوب
  { id: 'pc_word', category: 'مهارات الحاسوب', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'وورد (Word)', weight: 5 },
  { id: 'pc_excel', category: 'مهارات الحاسوب', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'إكسل (Excel)', weight: 5 },
  { id: 'pc_powerpoint', category: 'مهارات الحاسوب', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'بور بوينت (PowerPoint)', weight: 5 },
  { id: 'pc_internet', category: 'مهارات الحاسوب', categoryRole: 'ممثل الموارد البشرية و/أو الشخص الفني بتكنولوجيا المعلومات', name: 'إنترنت', weight: 5 },

  // 4. جميع أعضاء اللجنة - معرفة ، مهارات ، وقدرات معتدلة
  { id: 'comm_skills', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'مهارات الإتصال', weight: 5 },
  { id: 'teamwork', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'روح الفريق', weight: 5 },
  { id: 'problem_solving', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'حل المشاكل', weight: 5 },
  { id: 'planning_org', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'التخطيط والتنظيم', weight: 5 },
  { id: 'discipline', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'الإنضباط', weight: 5 },
  { id: 'flexibility', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'المرونة', weight: 5 },
  { id: 'leadership', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'مهارات قيادية', weight: 5 },
  { id: 'mgmt_skills', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'مهارات إدارية', weight: 5 },
  { id: 'analytical', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'مهارات تحليلية', weight: 5 },
  { id: 'appearance', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'المظهر المهني', weight: 5 },
  { id: 'other_skills', category: 'معرفة ، مهارات ، وقدرات معتدلة', categoryRole: 'جميع أعضاء اللجنة', name: 'أخرى', weight: 5 },
  { id: 'overall_profile', category: 'التقييم الإجمالي', categoryRole: 'جميع أعضاء اللجنة', name: 'التقييم الإجمالي للملف الشخصي', weight: 5 }
];

export interface MemberEvaluationState {
  scores: Record<string, number>; // criterionId -> score (1 to 5)
  notes: Record<string, string>; // criterionId -> notes
  proceedWithHiring: 'نعم' | 'لا' | '';
  hiringStep?: 'إختبار' | 'إجراء جولة مقابلات أخرى' | 'عرض وظيفي' | '';
  suggestAnotherJob: 'لا' | 'نعم' | '';
  suggestedJobTitle?: string;
  recommendations: string;
  trainingSuggestions: string;
  evaluatorSignature: string;
  evaluationDate: string;
  updatedAt?: string;
}

export const isCriterionApplicableToRole = (criterionRole: string, memberRole: string): boolean => {
  if (!memberRole) return true;
  if (memberRole === 'رئيس اللجنة') return true; // رئيس اللجنة يرى ويقيم كافة البنود أو يديرها
  if (criterionRole === 'جميع أعضاء اللجنة') return true;
  if (memberRole === 'ممثل الموارد البشرية' && (criterionRole === 'ممثل الموارد البشرية' || criterionRole.includes('الموارد البشرية'))) return true;
  if (memberRole === 'المشرف الفني و/أو المباشر' && criterionRole.includes('المشرف الفني')) return true;
  if (memberRole === 'الشخص الفني بتكنولوجيا المعلومات' && (criterionRole.includes('IT') || criterionRole.includes('تكنولوجيا') || criterionRole.includes('الفني'))) return true;
  return false;
};

interface PanelMemberMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate;
  committeeMembers: CommitteeMember[];
  currentUser: any;
  onSaveMemberEvaluation: (memberBadge: string, memberName: string, memberEvaluation: MemberEvaluationState, calculatedTotalScore: number) => void;
  isDark: boolean;
  t: (ar: string, en: string) => string;
}

export const PanelMemberMatrixModal: React.FC<PanelMemberMatrixModalProps> = ({
  isOpen,
  onClose,
  candidate,
  committeeMembers,
  currentUser,
  onSaveMemberEvaluation,
  isDark,
  t
}) => {
  // Determine default active member (match logged in user by badgeNo or employeeId if member of committee, else first member)
  const defaultMember = useMemo(() => {
    if (committeeMembers.length === 0) return null;
    const currentEmpId = String(currentUser?.employeeId || currentUser?.id || '');
    const currentBadge = String(currentUser?.badgeNo || '');
    const matched = committeeMembers.find(m => 
      (m.employeeId && String(m.employeeId) === currentEmpId) ||
      (m.badgeNo && String(m.badgeNo) === currentBadge) ||
      (m.fullName && currentUser?.fullName && m.fullName.trim() === currentUser.fullName.trim())
    );
    return matched || committeeMembers[0];
  }, [committeeMembers, currentUser]);

  const [selectedMemberBadge, setSelectedMemberBadge] = useState<string>('');
  const [filterMyRoleOnly, setFilterMyRoleOnly] = useState<boolean>(true);

  useEffect(() => {
    if (defaultMember) {
      setSelectedMemberBadge(defaultMember.badgeNo || defaultMember.id);
    }
  }, [defaultMember]);

  const activeMember = useMemo(() => {
    return committeeMembers.find(m => (m.badgeNo || m.id) === selectedMemberBadge) || committeeMembers[0] || null;
  }, [committeeMembers, selectedMemberBadge]);

  // Criteria visible to this member (ليملأ السجلات الخاصة به فقط)
  const visibleCriteria = useMemo(() => {
    if (!filterMyRoleOnly || !activeMember?.role || activeMember.role === 'رئيس اللجنة') {
      return MATRIX_CRITERIA_LIST;
    }
    return MATRIX_CRITERIA_LIST.filter(c => isCriterionApplicableToRole(c.categoryRole, activeMember.role));
  }, [filterMyRoleOnly, activeMember]);

  // Load existing evaluation data for this member if previously saved
  const storageKey = useMemo(() => {
    return `matrix_eval_${candidate.id}_${activeMember?.badgeNo || activeMember?.id || 'default'}`;
  }, [candidate.id, activeMember]);

  const [evalState, setEvalState] = useState<MemberEvaluationState>({
    scores: {},
    notes: {},
    proceedWithHiring: '',
    hiringStep: '',
    suggestAnotherJob: 'لا',
    suggestedJobTitle: '',
    recommendations: '',
    trainingSuggestions: '',
    evaluatorSignature: '',
    evaluationDate: new Date().toISOString().split('T')[0]
  });

  // Load from candidate's stored matrixEvaluations or localStorage
  useEffect(() => {
    if (!activeMember) return;
    const memKey = activeMember.badgeNo || activeMember.id;
    const candSaved = (candidate as any).matrixEvaluations?.[memKey];
    if (candSaved) {
      setEvalState(candSaved);
      return;
    }
    const local = localStorage.getItem(storageKey);
    if (local) {
      try {
        setEvalState(JSON.parse(local));
        return;
      } catch (e) {}
    }
    // Default fresh evaluation
    setEvalState({
      scores: {},
      notes: {},
      proceedWithHiring: '',
      hiringStep: '',
      suggestAnotherJob: 'لا',
      suggestedJobTitle: '',
      recommendations: '',
      trainingSuggestions: '',
      evaluatorSignature: activeMember.fullName || '',
      evaluationDate: new Date().toISOString().split('T')[0]
    });
  }, [activeMember, storageKey, candidate]);

  // Handle score change
  const handleScoreChange = (criterionId: string, score: number) => {
    setEvalState(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [criterionId]: score
      }
    }));
  };

  // Handle note change
  const handleNoteChange = (criterionId: string, note: string) => {
    setEvalState(prev => ({
      ...prev,
      notes: {
        ...prev.notes,
        [criterionId]: note
      }
    }));
  };

  // Calculate live weighted score
  const totalScoreCalc = useMemo(() => {
    let totalWeighted = 0;
    let maxPossible = 0;
    let scoredCount = 0;

    visibleCriteria.forEach(crit => {
      const score = evalState.scores[crit.id] || 0;
      const weighted = (crit.weight * score) / 5;
      totalWeighted += weighted;
      maxPossible += crit.weight;
      if (score > 0) scoredCount++;
    });

    // Score normalized to 100
    const score100 = maxPossible > 0 ? Math.round((totalWeighted / maxPossible) * 100) : 0;
    return {
      rawWeighted: totalWeighted,
      maxPossible,
      scoredCount,
      totalCount: visibleCriteria.length,
      score100
    };
  }, [evalState.scores, visibleCriteria]);

  // Save member evaluation
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleSave = () => {
    if (!activeMember) return;
    const updatedState = {
      ...evalState,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(storageKey, JSON.stringify(updatedState));

    onSaveMemberEvaluation(
      activeMember.badgeNo || activeMember.id,
      activeMember.fullName,
      updatedState,
      totalScoreCalc.score100
    );

    setSaveSuccessMsg(`تم حفظ تقييم عضو اللجنة (${activeMember.fullName}) بنجاح! الدرجة الموزونة: ${totalScoreCalc.score100}/100`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handlePrint = () => {
    const candidateName = candidate.fullName || candidate.fullNameAr || 'المرشح';
    const jobTitle = candidate.appliedJob || 'Loan Officer';
    const memberName = activeMember?.fullName || 'عضو اللجنة';
    const memberRole = activeMember?.committeeRole || 'عضو لجنة المقابلة';
    const memberBadge = activeMember?.badgeNo || '001';
    const memberBranch = activeMember?.branch || 'الإدارة العامة - بغداد';
    const evalDate = evalState.evaluationDate || new Date().toISOString().split('T')[0];

    const rowsHtml = MATRIX_CRITERIA_LIST.map((crit, idx) => {
      const score = evalState.scores[crit.id] || 0;
      const weighted = ((crit.weight * score) / 5).toFixed(1);
      const note = evalState.notes[crit.id] || '';
      const isFirstInCategory = idx === 0 || MATRIX_CRITERIA_LIST[idx - 1].category !== crit.category;

      let categoryRow = '';
      if (isFirstInCategory) {
        categoryRow = `
          <tr style="background-color: #f1f5f9; font-weight: bold; color: #0f766e; border-top: 2px solid #94a3b8; border-bottom: 2px solid #94a3b8;">
            <td colspan="6" style="padding: 5px 8px; font-size: 11px; text-align: right;">
              📁 ${crit.categoryRole} — ${crit.category}
            </td>
          </tr>
        `;
      }

      const scoreBadges = [1, 2, 3, 4, 5].map(val => {
        const isSelected = score === val;
        let style = 'display: inline-block; width: 19px; height: 19px; line-height: 17px; text-align: center; border-radius: 4px; font-size: 10px; font-weight: bold; margin: 0 1px;';
        if (isSelected) {
          if (val >= 4) {
            style += 'background-color: #10b981; color: #ffffff; border: 1px solid #059669; font-weight: 900;';
          } else if (val === 3) {
            style += 'background-color: #14b8a6; color: #ffffff; border: 1px solid #0d9488; font-weight: 900;';
          } else {
            style += 'background-color: #f59e0b; color: #ffffff; border: 1px solid #d97706; font-weight: 900;';
          }
        } else {
          style += 'background-color: #f8fafc; color: #94a3b8; border: 1px solid #e2e8f0;';
        }
        return `<span style="${style}">${val}</span>`;
      }).join('');

      return `
        ${categoryRow}
        <tr style="border-bottom: 1px solid #cbd5e1; page-break-inside: avoid;">
          <td style="padding: 4px 6px; font-size: 10px; color: #475569; border-left: 1px solid #cbd5e1; text-align: right;">${crit.categoryRole}</td>
          <td style="padding: 4px 6px; font-size: 10.5px; font-weight: bold; color: #0f172a; border-left: 1px solid #cbd5e1; text-align: right;">${crit.name}</td>
          <td style="padding: 4px 6px; text-align: center; border-left: 1px solid #cbd5e1; white-space: nowrap;">${scoreBadges}</td>
          <td style="padding: 4px 6px; text-align: center; font-weight: bold; font-family: monospace; border-left: 1px solid #cbd5e1;">${crit.weight}</td>
          <td style="padding: 4px 6px; text-align: center; font-weight: bold; font-family: monospace; color: #059669; border-left: 1px solid #cbd5e1;">${score > 0 ? weighted : '0.0'}</td>
          <td style="padding: 4px 6px; font-size: 9.5px; color: #334155; text-align: right;">${note || '—'}</td>
        </tr>
      `;
    }).join('');

    const fullHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>استمارة مصفوفة المقابلة - ${candidateName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      text-align: right;
      font-size: 11px;
      line-height: 1.35;
    }
    .header-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      background: #f8fafc;
    }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 14px;
      font-size: 10.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #94a3b8;
      border-radius: 6px;
      overflow: hidden;
    }
    th {
      background-color: #e2e8f0;
      color: #0f172a;
      font-weight: 900;
      font-size: 10.5px;
      padding: 6px 8px;
      border-bottom: 2px solid #94a3b8;
      border-left: 1px solid #94a3b8;
    }
    tr {
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d9488; padding-bottom: 6px; margin-bottom: 8px;">
    <div>
      <div style="font-size: 9.5px; font-weight: bold; color: #64748b;">جمهورية العراق • مؤسسة فيتاس العراق للتمويل الأصغر (VITAS IRAQ HRMS)</div>
      <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 2px;">
        استمارة مصفوفة المقابلة الرسمية (Panel Member Matrix Form)
      </div>
    </div>
    <div style="text-align: left; font-size: 9.5px; color: #64748b;">
      <div style="font-weight: 900; color: #0d9488; font-size: 12px;">VITAS IRAQ HRMS</div>
      <div>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-IQ')}</div>
    </div>
  </div>

  <div class="header-card">
    <div class="grid-info">
      <div><strong>👤 صاحب المقابلة (المرشح):</strong> <span style="font-weight: 900; color: #0f172a;">${candidateName}</span></div>
      <div><strong>💼 الوظيفة المتقدم إليها:</strong> <span style="color: #0f766e; font-weight: bold;">${jobTitle}</span></div>
      <div><strong>🎖️ عضو اللجنة المقيّم:</strong> <span style="color: #7c3aed; font-weight: bold;">${memberName}</span> (${memberRole})</div>
      <div><strong>🪪 باج / المكتب:</strong> باج: ${memberBadge} | ${memberBranch}</div>
      <div><strong>📅 تاريخ المقابلة والتقييم:</strong> ${evalDate}</div>
      <div>
        <strong>📊 المعدل الموزون:</strong>
        <span style="display: inline-block; padding: 1px 7px; border-radius: 5px; font-weight: 900; font-family: monospace; font-size: 10.5px; background-color: ${totalScoreCalc.score100 >= 80 ? '#059669' : totalScoreCalc.score100 >= 60 ? '#d97706' : '#e11d48'}; color: #ffffff;">
          ${totalScoreCalc.score100} / 100
        </span>
      </div>
    </div>
  </div>

  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 10px; margin-bottom: 8px; font-size: 9.5px; color: #166534; display: flex; justify-content: space-between; align-items: center;">
    <span><strong>مقياس التقدير (1 إلى 5):</strong> 1 = ضعيف جداً &nbsp;|&nbsp; 2 = مقبول &nbsp;|&nbsp; 3 = جيد &nbsp;|&nbsp; 4 = جيد جداً &nbsp;|&nbsp; 5 = ممتاز</span>
    <span><strong>إجمالي بنود المصفوفة:</strong> 28 بنداً كاملاً</span>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 130px; text-align: right;">الجهة المسؤولة</th>
        <th style="text-align: right;">عامل التقييم</th>
        <th style="width: 125px; text-align: center;">العلامة (1-5)</th>
        <th style="width: 45px; text-align: center;">الوزن</th>
        <th style="width: 75px; text-align: center;">العلامة الموزونة</th>
        <th style="width: 130px; text-align: right;">ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div style="margin-top: 8px; padding: 8px 12px; border-radius: 8px; background-color: #0f172a; color: #ffffff; border: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid;">
    <div>
      <div style="font-size: 9.5px; font-weight: bold; color: #2dd4bf;">المجموع الكلي للعلامات الموزونة (Formula: F*E/5):</div>
      <div style="font-size: 15px; font-weight: 900; color: #ffffff; margin-top: 2px; display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 20px; color: #34d399; font-family: monospace;">${totalScoreCalc.score100}</span>
        <span style="font-size: 9.5px; color: #cbd5e1;">من 100</span>
        <span style="font-size: 9.5px; font-weight: bold; padding: 1px 7px; border-radius: 9999px; background-color: rgba(20, 184, 166, 0.25); color: #5eead4; border: 1px solid rgba(20, 184, 166, 0.5);">${totalScoreCalc.scoredCount} / ${totalScoreCalc.totalCount} معيار مقيّم</span>
      </div>
    </div>
    <div style="font-size: 9.5px; color: #e2e8f0; max-width: 320px; text-align: right; line-height: 1.4;">
      تُحفظ هذه النتيجة رسمياً باسم عضو اللجنة <strong style="color: #fbbf24;">(${memberName})</strong> وتعتمد في تقييم اللجنة العام.
    </div>
  </div>

  <div style="margin-top: 8px; padding: 10px; border-radius: 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; page-break-inside: avoid;">
    <div style="font-size: 10.5px; font-weight: 900; color: #0f172a; margin-bottom: 6px;">
      📋 توصيات وقرار عضو اللجنة النهائي (Recommendations & Decision):
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9.5px;">
      <div style="padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff;">
        <strong>1. متابعة التوظيف (Proceed with Hiring):</strong>
        <div style="margin-top: 2px;">
          <span style="font-weight: bold; color: ${evalState.proceedWithHiring === 'نعم' ? '#059669' : '#64748b'};">${evalState.proceedWithHiring === 'نعم' ? '☑ نعم' : '☐ نعم'}</span>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span style="font-weight: bold; color: ${evalState.proceedWithHiring === 'لا' ? '#e11d48' : '#64748b'};">${evalState.proceedWithHiring === 'لا' ? '☑ لا' : '☐ لا'}</span>
          ${evalState.proceedWithHiring === 'نعم' && evalState.hiringStep ? `&nbsp;&nbsp;—&nbsp;&nbsp;<strong style="color: #0f766e;">الخطوة: ${evalState.hiringStep}</strong>` : ''}
        </div>
      </div>

      <div style="padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff;">
        <strong>2. اقتراح لوظيفة أخرى:</strong>
        <div style="margin-top: 2px;">
          <span>${evalState.suggestAnotherJob ? `☑ نعم (الوظيفة المقترحة: <strong style="color: #7c3aed;">${evalState.suggestedJobTitle || '—'}</strong>)` : '☒ لا'}</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 5px; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; font-size: 9.5px;">
      <strong>3. ملاحظات مدير التعيين / المقيّم:</strong>
      <div style="margin-top: 2px; color: #334155;">${evalState.hiringManagerComments || 'لا توجد ملاحظات إضافية'}</div>
    </div>

    <div style="margin-top: 5px; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; font-size: 9.5px;">
      <strong>4. مقترحات التدريب والتأهيل:</strong>
      <div style="margin-top: 2px; color: #334155;">${evalState.trainingSuggestions || 'لا توجد مقترحات تدريب'}</div>
    </div>

    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 5px; border-top: 1px dashed #cbd5e1; font-size: 9.5px;">
      <div>
        <div><strong>اسم عضو اللجنة:</strong> ${memberName} (باج: ${memberBadge})</div>
        <div><strong>تاريخ التقييم:</strong> ${evalDate}</div>
      </div>
      <div style="text-align: center;">
        <div><strong>توقيع عضو اللجنة:</strong></div>
        <div style="margin-top: 3px; font-weight: bold; border-bottom: 1px solid #000000; padding: 0 30px; font-size: 10.5px;">
          ${evalState.evaluatorSignature || memberName}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    let printFrame = document.getElementById('matrix-print-iframe') as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'matrix-print-iframe';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.visibility = 'hidden';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(fullHtml);
      frameDoc.close();
      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (e) {
          console.error('Print iframe error:', e);
        }
      }, 350);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div 
        dir="rtl"
        className={`w-full max-w-5xl max-h-[96vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden my-auto transition-all text-right ${
          isDark ? 'bg-[#0f172a] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        
        {/* ─── Modal Header ────────────────────────────────────────────── */}
        <div className={`p-4 sm:p-5 border-b shrink-0 flex items-center justify-between ${
          isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                  Panel Member Matrix Form
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  استمارة مصفوفة المقابلة الرسمية
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black mt-0.5 text-slate-900 dark:text-white flex items-center gap-2">
                <span>نموذج مصفوفة مقابلة عضو اللجنة</span>
                <span className="text-xs font-normal text-slate-500">|</span>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400">
                  المرشح: {candidate.fullName || candidate.fullNameAr}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="طباعة الاستمارة الرسمية A4"
            >
              <span className="material-symbols-outlined text-sm text-slate-600 dark:text-slate-300">print</span>
              <span className="hidden sm:inline">طباعة الاستمارة</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
        </div>

        {/* ─── Committee Members Switcher Tabs (ليملأ السجلات الخاصة به فقط) ─── */}
        <div className={`px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100/70 border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-purple-500">group</span>
              <span>عضو اللجنة الحالي:</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {committeeMembers.map((member) => {
              const memKey = member.badgeNo || member.id;
              const isSelected = (activeMember?.badgeNo || activeMember?.id) === memKey;
              const hasEvaluation = (candidate as any).matrixEvaluations?.[memKey] || localStorage.getItem(`matrix_eval_${candidate.id}_${memKey}`);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedMemberBadge(memKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-400/40'
                      : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-200 shadow-xs'
                  }`}
                >
                  <span className="material-symbols-outlined text-xs">
                    {member.role === 'رئيس اللجنة' ? 'star' : 'person'}
                  </span>
                  <span>{member.fullName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-purple-800 text-purple-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}>
                    {member.badgeNo ? `#${member.badgeNo}` : member.role}
                  </span>
                  {hasEvaluation && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="تم التقييم" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Active Member & Candidate Info Banner ─────────────────────── */}
        {activeMember && (
          <div className={`mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl border text-xs grid grid-cols-2 md:grid-cols-4 gap-3 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-[10px] text-slate-500 block">👤 اسم صاحب المقابلة (المرشح):</span>
              <strong className="text-teal-600 dark:text-teal-400 text-sm font-bold truncate block">
                {candidate.fullName || candidate.fullNameAr}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">💼 الوظيفة المتقدم إليها:</span>
              <strong className="truncate block">{candidate.jobTitle || 'وظيفة إدارية'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">🧑‍⚖️ إسم عضو اللجنة المقيّم:</span>
              <strong className="text-purple-600 dark:text-purple-400 text-sm font-bold truncate block">
                {activeMember.fullName} ({activeMember.role})
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">🪪 باج / مكتب المقيم:</span>
              <strong className="font-mono truncate block">
                باج: {activeMember.badgeNo} | {activeMember.officeName || 'المقر الرئيسي'}
              </strong>
            </div>
          </div>
        )}

        {/* ─── Rating Instructions Bar ──────────────────────────────────── */}
        <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-500">info</span>
            <span className="font-bold">
              يرجى وضع علامة من 1 إلى 5 لكل عامل من عوامل التقييم ؛ أقل علامة تقدير هي 1 وأعلاها هي 5
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono font-bold text-[11px]">
            <span>1 = ضعيف جداً</span>
            <span>2 = مقبول</span>
            <span>3 = جيد</span>
            <span>4 = جيد جداً</span>
            <span className="text-emerald-600 dark:text-emerald-400">5 = ممتاز</span>
          </div>
        </div>

        {/* Save message alert */}
        {saveSuccessMsg && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-base">check_circle</span>
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* ─── Role Filter & Records Progress Bar (ليملأ السجلات الخاصة به فقط) ─── */}
        <div className="mx-4 sm:mx-6 mt-3 px-4 py-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-teal-600 dark:text-teal-400">filter_list</span>
              <span>نطاق السجلات:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterMyRoleOnly(true)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  filterMyRoleOnly
                    ? 'bg-teal-600 text-white border-teal-500 shadow-sm ring-2 ring-teal-400/30'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="عرض وتعبئة السجلات الخاصة بدور العضو الحالي فقط"
              >
                <span className="material-symbols-outlined text-xs">person_pin</span>
                <span>سجلاتي الخاصة فقط ({activeMember?.role || 'العضو'})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/20 font-mono">
                  {MATRIX_CRITERIA_LIST.filter(c => isCriterionApplicableToRole(c.categoryRole, activeMember?.role || '')).length} بنداً
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMyRoleOnly(false)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  !filterMyRoleOnly
                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm ring-2 ring-purple-400/30'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title="عرض كافة بنود مصفوفة المقابلة الـ 28"
              >
                <span className="material-symbols-outlined text-xs">view_agenda</span>
                <span>كافة بنود المصفوفة (28 بنداً)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              المكتمل: <strong className="text-slate-900 dark:text-white font-mono">{totalScoreCalc.scoredCount} / {totalScoreCalc.totalCount}</strong>
            </span>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <span className="font-bold flex items-center gap-1.5">
              <span>المعدل الموزون:</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-mono font-black text-white shadow-xs ${
                totalScoreCalc.score100 >= 80 ? 'bg-emerald-600' :
                totalScoreCalc.score100 >= 60 ? 'bg-amber-600' :
                'bg-rose-600'
              }`}>
                {totalScoreCalc.score100} / 100
              </span>
            </span>
          </div>
        </div>

        {/* ─── Modal Body: Matrix Criteria Table ─────────────────────────── */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6" dir="rtl">
          <div className={`rounded-2xl border-2 overflow-hidden shadow-md ${
            isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-300 bg-white'
          }`} dir="rtl">
            <table className="w-full text-right text-xs border-collapse" dir="rtl">
              <thead>
                <tr className={isDark ? 'bg-slate-900 text-slate-100 border-b-2 border-slate-700' : 'bg-slate-200/90 text-slate-900 border-b-2 border-slate-300'}>
                  <th className="p-3 w-40 font-black border-l-2 border-slate-300 dark:border-slate-700 text-right">الجهة المسؤولة</th>
                  <th className="p-3 font-black border-l-2 border-slate-300 dark:border-slate-700 text-right">عامل التقييم</th>
                  <th className="p-3 w-48 text-center font-black border-l-2 border-slate-300 dark:border-slate-700">العلامة (1-5)</th>
                  <th className="p-3 w-20 text-center font-black border-l-2 border-slate-300 dark:border-slate-700">الوزن</th>
                  <th className="p-3 w-28 text-center font-black border-l-2 border-slate-300 dark:border-slate-700">العلامة الموزونة</th>
                  <th className="p-3 w-44 font-black text-right">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {visibleCriteria.map((crit, idx) => {
                  const score = evalState.scores[crit.id] || 0;
                  const weighted = ((crit.weight * score) / 5).toFixed(1);
                  const note = evalState.notes[crit.id] || '';

                  // Show Category Header if it's the first in its category
                  const isFirstInCategory = idx === 0 || visibleCriteria[idx - 1].category !== crit.category;

                  return (
                    <React.Fragment key={crit.id}>
                      {isFirstInCategory && (
                        <tr className={isDark ? 'bg-slate-800 font-bold text-teal-300 border-t-2 border-b-2 border-slate-700' : 'bg-slate-100 font-bold text-teal-900 border-t-2 border-b-2 border-slate-300'}>
                          <td className="p-2.5 px-3 text-[11px] text-right font-black" colSpan={6}>
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-sm">folder</span>
                              <span>{crit.categoryRole} — {crit.category}</span>
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className={`border-b border-slate-300 dark:border-slate-700 transition-colors ${
                        isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                      }`}>
                        <td className="p-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400 border-l border-slate-300 dark:border-slate-700 truncate text-right font-medium">
                          {crit.categoryRole}
                        </td>
                        <td className="p-2.5 px-3 font-bold text-slate-900 dark:text-white border-l border-slate-300 dark:border-slate-700 text-right">
                          {crit.name}
                        </td>
                        <td className="p-2.5 px-3 text-center border-l border-slate-300 dark:border-slate-700">
                          <div className="flex items-center justify-center gap-1" dir="ltr">
                            {[1, 2, 3, 4, 5].map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleScoreChange(crit.id, val)}
                                className={`w-7 h-7 rounded-lg text-xs font-black transition-all ${
                                  score === val
                                    ? val >= 4 
                                      ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-400 scale-105'
                                      : val === 3
                                        ? 'bg-teal-500 text-slate-950 shadow-md ring-2 ring-teal-400 scale-105'
                                        : 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 scale-105'
                                    : isDark
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600'
                                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-l border-slate-300 dark:border-slate-700">
                          {crit.weight}
                        </td>
                        <td className="p-2.5 px-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 border-l border-slate-300 dark:border-slate-700">
                          {score > 0 ? weighted : '0.0'}
                        </td>
                        <td className="p-2 px-3 text-right">
                          <input
                            type="text"
                            value={note}
                            onChange={(e) => handleNoteChange(crit.id, e.target.value)}
                            placeholder="ملاحظات..."
                            dir="rtl"
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs border text-right transition-colors ${
                              isDark ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-teal-400' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-teal-600'
                            }`}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ─── Total Score Calculation Banner ─────────────────────────────── */}
          <div 
            className="p-4 rounded-2xl border-2 shadow-sm flex flex-wrap items-center justify-between gap-4"
            style={{
              backgroundColor: isDark ? '#0f172a' : '#f8fafc',
              borderColor: isDark ? '#334155' : '#cbd5e1',
              color: isDark ? '#ffffff' : '#000000'
            }}
          >
            <div>
              <div 
                className="text-xs font-black"
                style={{ color: isDark ? '#2dd4bf' : '#000000' }}
              >
                المجموع الكلي للعلامات الموزونة (Formula: F*E/5):
              </div>
              <div className="text-lg font-black flex items-center gap-2 mt-1">
                <span 
                  className="text-2xl font-mono font-black" 
                  style={{ color: isDark ? '#34d399' : '#047857' }}
                >
                  {totalScoreCalc.score100}
                </span>
                <span 
                  className="text-xs font-bold" 
                  style={{ color: isDark ? '#cbd5e1' : '#000000' }}
                >
                  من 100
                </span>
                <span 
                  className="text-xs font-black px-2.5 py-0.5 rounded-full" 
                  style={{
                    backgroundColor: isDark ? 'rgba(20, 184, 166, 0.25)' : '#ccfbf1',
                    color: isDark ? '#5eead4' : '#0f766e',
                    border: isDark ? '1px solid rgba(20, 184, 166, 0.5)' : '1px solid #5eead4'
                  }}
                >
                  {totalScoreCalc.scoredCount} / {totalScoreCalc.totalCount} معيار مقيّم
                </span>
              </div>
            </div>

            <div 
              className="text-xs max-w-md text-right leading-relaxed font-bold" 
              style={{ color: isDark ? '#e2e8f0' : '#000000' }}
            >
              يتم حفظ هذه الدرجة كتقييم مستقل للعضو <strong style={{ color: isDark ? '#fbbf24' : '#b45309', fontWeight: '900' }}>({activeMember?.fullName})</strong>، ويتم احتساب متوسط درجات أعضاء اللجنة الإجمالي تلقائياً في دائرة التقييم الخاصة بالمرشح.
            </div>
          </div>

          {/* ─── Footer Section: Recommendations & Final Decision (Row 45+) ─ */}
          <div className={`p-5 rounded-2xl border space-y-4 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 uppercase">
              <span className="material-symbols-outlined text-sm text-purple-500">assignment_turned_in</span>
              <span>توصيات وقرار عضو اللجنة النهائي (Recommendations & Decision):</span>
            </h4>

            {/* 1. متابعة التوظيف */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/5 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                1. متابعة التوظيف (Proceed with Hiring?):
              </div>
              <div className="flex flex-wrap items-center gap-6 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="proceedWithHiring"
                    value="نعم"
                    checked={evalState.proceedWithHiring === 'نعم'}
                    onChange={() => setEvalState(prev => ({ ...prev, proceedWithHiring: 'نعم' }))}
                    className="accent-emerald-600 w-4 h-4"
                  />
                  <span className="text-emerald-600 dark:text-emerald-400">نعم</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="proceedWithHiring"
                    value="لا"
                    checked={evalState.proceedWithHiring === 'لا'}
                    onChange={() => setEvalState(prev => ({ ...prev, proceedWithHiring: 'لا', hiringStep: '' }))}
                    className="accent-rose-600 w-4 h-4"
                  />
                  <span className="text-rose-600 dark:text-rose-400">لا</span>
                </label>

                {evalState.proceedWithHiring === 'نعم' && (
                  <div className="flex items-center gap-4 border-r border-slate-300 dark:border-slate-700 pr-4">
                    <span className="text-[11px] text-slate-500">إذا كان نعم:</span>
                    {(['إختبار', 'إجراء جولة مقابلات أخرى', 'عرض وظيفي'] as const).map(step => (
                      <label key={step} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="hiringStep"
                          value={step}
                          checked={evalState.hiringStep === step}
                          onChange={() => setEvalState(prev => ({ ...prev, hiringStep: step }))}
                          className="accent-purple-600"
                        />
                        <span>{step}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. اقترحه لوظيفة أخرى */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/5 space-y-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                2. إقترحه لوظيفة أخرى (Suggest for another job?):
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="suggestAnotherJob"
                    value="لا"
                    checked={evalState.suggestAnotherJob === 'لا'}
                    onChange={() => setEvalState(prev => ({ ...prev, suggestAnotherJob: 'لا', suggestedJobTitle: '' }))}
                    className="accent-slate-600 w-4 h-4"
                  />
                  <span>لا</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="radio"
                    name="suggestAnotherJob"
                    value="نعم"
                    checked={evalState.suggestAnotherJob === 'نعم'}
                    onChange={() => setEvalState(prev => ({ ...prev, suggestAnotherJob: 'نعم' }))}
                    className="accent-purple-600 w-4 h-4"
                  />
                  <span>نعم ، أي وظيفة؟</span>
                </label>

                {evalState.suggestAnotherJob === 'نعم' && (
                  <input
                    type="text"
                    value={evalState.suggestedJobTitle || ''}
                    onChange={e => setEvalState(prev => ({ ...prev, suggestedJobTitle: e.target.value }))}
                    placeholder="حدد عنوان الوظيفة المقترحة..."
                    className={`px-3 py-1.5 rounded-lg text-xs border ${
                      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                )}
              </div>
            </div>

            {/* 3. ملاحظات وتوصيات المقيّم إلى مدير التعيين */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                3. ملاحظات وتوصيات المقيّم إلى مدير التعيين:
              </label>
              <textarea
                rows={2}
                value={evalState.recommendations}
                onChange={e => setEvalState(prev => ({ ...prev, recommendations: e.target.value }))}
                placeholder="قم بإعطاء تقييمك الإجمالي وإنطباعك مبيناً نقاط القوة والضعف لدى المرشح أو أية ملاحظات خاصة..."
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* 4. إقتراحات التدريب */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                4. إقتراحات التدريب (Training Suggestions):
              </label>
              <textarea
                rows={2}
                value={evalState.trainingSuggestions}
                onChange={e => setEvalState(prev => ({ ...prev, trainingSuggestions: e.target.value }))}
                placeholder="اكتب أية دورات تدريبية أو تأهيلية يوصى بها للمرشح في حال قبوله..."
                className={`w-full p-2.5 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Signature & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">✍️ توقيع إلكتروني / اسم المقيّم:</label>
                <input
                  type="text"
                  value={evalState.evaluatorSignature}
                  onChange={e => setEvalState(prev => ({ ...prev, evaluatorSignature: e.target.value }))}
                  className={`w-full px-3 py-1.5 rounded-lg border font-bold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">📅 التاريخ:</label>
                <input
                  type="date"
                  value={evalState.evaluationDate}
                  onChange={e => setEvalState(prev => ({ ...prev, evaluationDate: e.target.value }))}
                  className={`w-full px-3 py-1.5 rounded-lg border font-mono ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Modal Footer Buttons ────────────────────────────────────── */}
        <div className={`p-4 sm:p-5 border-t shrink-0 flex items-center justify-between ${
          isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ملاحظة: تُحفظ هذه الاستمارة رسمياً باسم عضو اللجنة <strong>({activeMember?.fullName})</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-500/25 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              <span>حفظ استمارة التقييم الخاصة بالعضو</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

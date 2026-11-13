/**
 * GlobalReportTable — Renders the Global Report in the exact same layout
 * as the monthly sheets of 2026-10-Global Report VITAS ATAS.xls
 *
 * Sections:
 *   1. CHFVITAS  – Iraqi branches (live from exactWorkbooksData.json)
 *   2. Amalkom   – All zeros (no active Amalkom branches currently)
 *   3. ATAS      – Lebanon Office (static: 6 staff)
 *   4. VITAS + ATAS – Combined total (CHFVITAS + ATAS)
 */

import React, { useMemo } from 'react';
import { Language } from '../types/hr';

interface GlobalRow {
  office: string;
  maleOffice: number;
  femaleOffice: number;
  totalOffice: number;
  maleField: number;
  femaleField: number;
  totalLineField: number;
  totalField: number;
  securityGuards: number;
  maleLoanOfficers: number;
  collectionOfficers: number;
  femaleLoanOfficers: number;
  femaleCollectionOfficers: number;
  totalLoanOfficers: number;
  totalFemaleStaff: number;
  totalCollectionStaff: number;
  staffHired: number;
  staffLeft: number;
  movedFromOtherBranch: number;
  movedToOtherBranch: number;
  totalStaff: number;
  differenceCheck: number;
  isTotal?: boolean;
  isSectionHeader?: boolean;
  sectionLabel?: string;
}

interface GlobalReportTableProps {
  data: any[]; // CHFVITAS rows from reportingEngine (excludes Total row)
  language: Language;
  reportingPeriod: string;
}

const NUM_COLS = [
  'maleOffice', 'femaleOffice', 'totalOffice',
  'maleField', 'femaleField', 'totalLineField', 'totalField',
  'securityGuards',
  'maleLoanOfficers', 'collectionOfficers', 'femaleLoanOfficers', 'femaleCollectionOfficers', 'totalLoanOfficers',
  'totalFemaleStaff', 'totalCollectionStaff',
  'staffHired', 'staffLeft', 'movedFromOtherBranch', 'movedToOtherBranch',
  'totalStaff', 'differenceCheck',
] as const;

function sumRows(rows: any[]): Record<string, number> {
  const sums: Record<string, number> = {};
  NUM_COLS.forEach(col => {
    sums[col] = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
  });
  return sums;
}

function computeDiffCheck(r: any): number {
  const prevTotal = 0; // We don't track prev month here; leave as 0 (matches sheet)
  return Number(r.totalOffice || 0) + Number(r.totalField || 0) + Number(r.securityGuards || 0) - Number(r.totalStaff || 0);
}

export const GlobalReportTable: React.FC<GlobalReportTableProps> = ({
  data,
  language,
  reportingPeriod,
}) => {
  const isAr = language === 'ar';

  // ── Separate data rows from the Total row ──────────────────────────
  const chfvitasRows = useMemo(
    () => data.filter(r => r.office?.toLowerCase() !== 'total'),
    [data]
  );
  const chfvitasTotal = useMemo(() => sumRows(chfvitasRows), [chfvitasRows]);

  // ── ATAS Section (Lebanon) — static from Oct.26 ───────────────────
  const atasRows: any[] = useMemo(() => ([
    {
      office: 'Lebanon Office',
      maleOffice: 2, femaleOffice: 4, totalOffice: 6,
      maleField: 0, femaleField: 0, totalLineField: 0, totalField: 0,
      securityGuards: 0,
      maleLoanOfficers: 0, collectionOfficers: 0,
      femaleLoanOfficers: 0, femaleCollectionOfficers: 0, totalLoanOfficers: 0,
      totalFemaleStaff: 4, totalCollectionStaff: 0,
      staffHired: 0, staffLeft: 0, movedFromOtherBranch: 0, movedToOtherBranch: 0,
      totalStaff: 6, differenceCheck: 0,
    }
  ]), []);
  const atasTotal = useMemo(() => sumRows(atasRows), [atasRows]);

  // ── Amalkom Section — all zeros ───────────────────────────────────
  const amalkomOffices = [
    'Basrah Office', 'Diwaniyah Office', 'Erbil Office', 'Hilla Office',
    'Hindia Office', 'Karbalaa Office', 'Kut Office', 'Main Office',
    'Mansour Office', 'Mudaina Office', 'Najjaf Office', 'Nassiriyah Office',
    'Samawa Office', 'Sulaimaniyah Office', 'Wehdah Office',
  ];
  const amalkomRows: any[] = useMemo(() =>
    amalkomOffices.map(office => ({
      office,
      maleOffice: 0, femaleOffice: 0, totalOffice: 0,
      maleField: 0, femaleField: 0, totalLineField: 0, totalField: 0,
      securityGuards: 0,
      maleLoanOfficers: 0, collectionOfficers: 0,
      femaleLoanOfficers: 0, femaleCollectionOfficers: 0, totalLoanOfficers: 0,
      totalFemaleStaff: 0, totalCollectionStaff: 0,
      staffHired: 0, staffLeft: 0, movedFromOtherBranch: 0, movedToOtherBranch: 0,
      totalStaff: 0, differenceCheck: 0,
    })), []
  );
  const amalkomTotal = useMemo(() => sumRows(amalkomRows), [amalkomRows]);

  // ── VITAS + ATAS combined rows ────────────────────────────────────
  // Merge all CHFVITAS offices + Lebanon, sum per office
  const vitasAtasRows = useMemo(() => {
    const lebanon = atasRows[0];
    return [
      { ...lebanon },
      ...chfvitasRows,
    ].sort((a, b) => a.office.localeCompare(b.office));
  }, [chfvitasRows, atasRows]);
  const vitasAtasTotal = useMemo(() => sumRows(vitasAtasRows), [vitasAtasRows]);

  // ── Column header definitions ─────────────────────────────────────
  const cols = [
    { key: 'office',                  enLabel: 'Office / Branch',              arLabel: 'المكتب / الفرع',          isHeader: true  },
    { key: 'maleOffice',              enLabel: 'Male Office Staff',             arLabel: 'إدارة ذكور'                              },
    { key: 'femaleOffice',            enLabel: 'Female Office Staff',           arLabel: 'إدارة إناث'                              },
    { key: 'totalOffice',             enLabel: 'Total Office Staff',            arLabel: 'إجمالي الإدارة',          isSubTotal: true},
    { key: 'maleField',               enLabel: 'Male Field Staff',              arLabel: 'ميدان ذكور'                              },
    { key: 'femaleField',             enLabel: 'Female Field Staff',            arLabel: 'ميدان إناث'                              },
    { key: 'totalLineField',          enLabel: 'Total Line/Field Staff',        arLabel: 'الكادر الميداني المباشر'                 },
    { key: 'totalField',              enLabel: 'Total Field Staff',             arLabel: 'إجمالي الميدان',          isSubTotal: true},
    { key: 'securityGuards',          enLabel: 'Security Guards',               arLabel: 'حراس الأمن'                              },
    { key: 'maleLoanOfficers',        enLabel: 'Male Loan Officers',            arLabel: 'إقراض ذكور'                              },
    { key: 'collectionOfficers',      enLabel: 'Collection Officer',            arLabel: 'تحصيل ذكور'                              },
    { key: 'femaleLoanOfficers',      enLabel: 'Female Loan Officers',          arLabel: 'إقراض إناث'                              },
    { key: 'femaleCollectionOfficers',enLabel: 'Female Collection Officers',    arLabel: 'تحصيل إناث'                              },
    { key: 'totalLoanOfficers',       enLabel: 'Total Loan Officers',           arLabel: 'إجمالي الإقراض',          isSubTotal: true},
    { key: 'totalFemaleStaff',        enLabel: 'Total Female Staff',            arLabel: 'إجمالي الإناث',           isSubTotal: true},
    { key: 'totalCollectionStaff',    enLabel: 'Total Collection Staff',        arLabel: 'إجمالي التحصيل'                          },
    { key: 'staffHired',              enLabel: 'Staff Hired',                   arLabel: 'تعيينات'                                 },
    { key: 'staffLeft',               enLabel: 'Staff Who Left',                arLabel: 'مغادرون'                                 },
    { key: 'movedFromOtherBranch',    enLabel: 'Moved From Branch',             arLabel: 'نقل (وارد)'                              },
    { key: 'movedToOtherBranch',      enLabel: 'Moved To Branch',               arLabel: 'نقل (صادر)'                              },
    { key: 'totalStaff',              enLabel: 'Total Staff',                   arLabel: 'إجمالي الكادر',           isGrandTotal: true},
    { key: 'differenceCheck',         enLabel: 'Diff Check',                    arLabel: 'فحص التوازن'                             },
  ];

  // ── Render helpers ────────────────────────────────────────────────
  const Cell: React.FC<{ value: any; isNum?: boolean; bold?: boolean; highlight?: string }> = ({
    value, isNum = false, bold = false, highlight,
  }) => {
    const base = 'px-2 py-1 text-xs whitespace-nowrap border border-slate-200 dark:border-slate-700';
    const align = isNum ? 'text-right' : 'text-left';
    const weight = bold ? 'font-semibold' : '';
    const bg = highlight || '';
    return (
      <td className={`${base} ${align} ${weight} ${bg}`}>
        {typeof value === 'number' ? (value === 0 ? '—' : value.toLocaleString()) : value}
      </td>
    );
  };

  const SectionHeader: React.FC<{ label: string; color: string }> = ({ label, color }) => (
    <tr>
      <td
        colSpan={cols.length}
        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide border border-slate-300 dark:border-slate-600 ${color}`}
      >
        {label}
      </td>
    </tr>
  );

  const ColumnHeaderRow: React.FC<{ sectionKey: string }> = ({ sectionKey }) => (
    <tr className="bg-teal-800 dark:bg-teal-900">
      {cols.map(c => (
        <th
          key={`${sectionKey}-${c.key}`}
          className="px-2 py-1.5 text-left text-[10px] font-semibold text-white border border-teal-700 whitespace-nowrap"
          style={{ minWidth: c.isHeader ? 160 : 70 }}
        >
          {isAr ? c.arLabel : c.enLabel}
        </th>
      ))}
    </tr>
  );

  const DataRow: React.FC<{ row: any; striped?: boolean }> = ({ row, striped }) => (
    <tr className={striped ? 'bg-slate-50 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900'}>
      <td className="px-2 py-1 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
        {row.office}
      </td>
      {cols.slice(1).map(c => (
        <Cell
          key={c.key}
          value={row[c.key] ?? 0}
          isNum
          bold={c.isGrandTotal}
          highlight={
            c.isGrandTotal
              ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-100 font-semibold'
              : c.isSubTotal
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200'
              : ''
          }
        />
      ))}
    </tr>
  );

  const TotalRow: React.FC<{ totals: Record<string, number>; label?: string }> = ({ totals, label }) => (
    <tr className="bg-teal-700 dark:bg-teal-800 text-white">
      <td className="px-2 py-1.5 text-xs font-bold border border-teal-600 dark:border-teal-700 whitespace-nowrap">
        {label || (isAr ? 'الإجمالي' : 'Total')}
      </td>
      {cols.slice(1).map(c => (
        <td
          key={c.key}
          className="px-2 py-1.5 text-xs font-bold text-right border border-teal-600 dark:border-teal-700 whitespace-nowrap"
        >
          {(totals[c.key] ?? 0) === 0 ? '—' : (totals[c.key] ?? 0).toLocaleString()}
        </td>
      ))}
    </tr>
  );

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Report title bar */}
      <div className="bg-slate-900 dark:bg-slate-950 px-4 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-white font-bold text-sm">
            {isAr ? 'التقرير الشامل للفروع' : 'Global Headcount Report'}
          </span>
          <span className="ml-3 text-teal-400 text-xs font-mono">{reportingPeriod}</span>
        </div>
        <span className="text-slate-400 text-[11px]">
          {isAr ? 'مطابق لمصنف: 2026-10-Global Report VITAS ATAS.xls' : 'Source: 2026-10-Global Report VITAS ATAS.xls'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse w-full text-xs">

          {/* ── SECTION 1: CHFVITAS ── */}
          <tbody>
            <SectionHeader
              label={isAr ? '١. CHFVITAS — الفروع العراقية' : '1. CHFVITAS — Iraqi Branches'}
              color="bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-100"
            />
          </tbody>
          <thead>
            <ColumnHeaderRow sectionKey="chf" />
          </thead>
          <tbody>
            {chfvitasRows.map((row, i) => (
              <DataRow key={row.id || row.office} row={row} striped={i % 2 === 1} />
            ))}
            <TotalRow totals={chfvitasTotal} />
          </tbody>

          {/* ── SECTION 2: Amalkom ── */}
          <tbody>
            <tr><td colSpan={cols.length} className="h-2 bg-transparent border-0" /></tr>
            <SectionHeader
              label={isAr ? '٢. Amalkom — لا توجد فروع نشطة حالياً' : '2. Amalkom — No Active Branches Currently'}
              color="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300"
            />
          </tbody>
          <thead>
            <ColumnHeaderRow sectionKey="amalkom" />
          </thead>
          <tbody>
            {amalkomRows.map((row, i) => (
              <DataRow key={row.office + '-amalkom'} row={row} striped={i % 2 === 1} />
            ))}
            <TotalRow totals={amalkomTotal} />
          </tbody>

          {/* ── SECTION 3: ATAS ── */}
          <tbody>
            <tr><td colSpan={cols.length} className="h-2 bg-transparent border-0" /></tr>
            <SectionHeader
              label={isAr ? '٣. ATAS — المكتب اللبناني' : '3. ATAS — Lebanon Office'}
              color="bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200"
            />
          </tbody>
          <thead>
            <ColumnHeaderRow sectionKey="atas" />
          </thead>
          <tbody>
            {atasRows.map((row, i) => (
              <DataRow key={row.office + '-atas'} row={row} striped={i % 2 === 1} />
            ))}
            <TotalRow totals={atasTotal} />
          </tbody>

          {/* ── SECTION 4: VITAS + ATAS Combined ── */}
          <tbody>
            <tr><td colSpan={cols.length} className="h-2 bg-transparent border-0" /></tr>
            <SectionHeader
              label={isAr ? '٤. VITAS + ATAS — الإجمالي الموحد' : '4. VITAS + ATAS — Combined Total'}
              color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200"
            />
          </tbody>
          <thead>
            <ColumnHeaderRow sectionKey="vitasatas" />
          </thead>
          <tbody>
            {vitasAtasRows.map((row, i) => (
              <DataRow key={row.office + '-vitasatas'} row={row} striped={i % 2 === 1} />
            ))}
            <TotalRow totals={vitasAtasTotal} label={isAr ? 'الإجمالي الكلي' : 'Grand Total'} />
          </tbody>

        </table>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-4 py-2 flex flex-wrap gap-4 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          <span className="font-semibold text-teal-700 dark:text-teal-400">{chfvitasTotal.totalStaff.toLocaleString()}</span>
          {isAr ? ' موظف CHFVITAS' : ' CHFVITAS Staff'}
        </span>
        <span>+</span>
        <span>
          <span className="font-semibold text-blue-700 dark:text-blue-400">{atasTotal.totalStaff.toLocaleString()}</span>
          {isAr ? ' موظف ATAS' : ' ATAS Staff'}
        </span>
        <span>=</span>
        <span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{vitasAtasTotal.totalStaff.toLocaleString()}</span>
          {isAr ? ' إجمالي VITAS+ATAS' : ' Total VITAS+ATAS'}
        </span>
        <span className="ms-auto">
          {isAr ? 'الإناث:' : 'Female Staff:'}
          <span className="font-semibold text-pink-600 dark:text-pink-400 ml-1">{vitasAtasTotal.totalFemaleStaff}</span>
          <span className="ml-1 text-slate-400">
            ({vitasAtasTotal.totalStaff > 0
              ? ((vitasAtasTotal.totalFemaleStaff / vitasAtasTotal.totalStaff) * 100).toFixed(1)
              : 0}%)
          </span>
        </span>
      </div>
    </div>
  );
};

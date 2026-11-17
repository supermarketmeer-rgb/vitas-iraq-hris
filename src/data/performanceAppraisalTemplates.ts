// Performance Appraisal Templates Master Data
// Extracted directly from official Excel sheets in C:\Users\Hp\Desktop\HRMS\Master Data

export interface AppraisalItem {
  num: number;
  text: string;
  defaultEmpScore?: number;
  defaultMgrScore?: number;
}

export interface AppraisalSection {
  number: number;
  title: string;
  items: AppraisalItem[];
  isLeadership?: boolean;
}

export interface GoalRow {
  goal: string;
  weight: number;
  party: 'employee' | 'supervisor';
}

export interface TrainingRow {
  title: string;
  type: string; // 'له علاقة بالعمل' | 'له علاقة بالمهارات' | 'له علاقة بالمسار الوظيفي'
  party: 'employee' | 'supervisor';
}

export interface PerformanceAppraisalTemplate {
  id: string;
  filename: string;
  titleEn: string;
  titleAr: string;
  defaultYear: string;
  fullTitle: string;
  scaleText: string;
  downloadUrl: string;
  sections: AppraisalSection[];
  hasLeadershipSection: boolean;
  scoringType: 'cleaner' | 'staff' | 'team_leaders';
  defaultGoals: GoalRow[];
  defaultTrainings: TrainingRow[];
}

export function getFormattedAppraisalTitles(template: PerformanceAppraisalTemplate, year: number | string = 2026) {
  const yrNum = typeof year === 'number' ? year : (parseInt(String(year).replace(/\D/g, ''), 10) || 2026);
  const shortYear = String(yrNum).slice(-2);
  const fyTag = `FY-${shortYear}`;
  
  // Cleanly replace any legacy FY tags (e.g. FY-24, FY-25, (FY-24), etc.)
  const titleEn = template.titleEn.replace(/\(?FY-?\d+\s*\)?/gi, `(${fyTag})`).trim();
  const titleAr = template.titleAr.replace(/\(?FY-?\d+\s*\)?/gi, `(${fyTag})`).trim();
  const fullTitle = `${titleEn}\n ${fyTag} ${titleAr.replace(`(${fyTag})`, '').trim()} (${fyTag})`;
  
  return { titleEn, titleAr, fullTitle, fyTag, year: yrNum };
}

export const PERFORMANCE_APPRAISAL_TEMPLATES: PerformanceAppraisalTemplate[] = [
  {
    "id": "pa-maintenance-cleaner",
    "filename": "Maintenance Cleaner PA.xlsx",
    "titleEn": "(Maintenance / Cleaner) Annual Performance Appraisal (FY-25)",
    "titleAr": "نموذج تقييم الأداء السنوي لعمال الصيانة والنظافة (FY-25)",
    "defaultYear": "FY-25",
    "fullTitle": "(Maintenance / Cleaner) Annual Performance Appraisal (FY-25 )\n FY-25 نموذج تقييم الأداء السنوي لعمال الصيانة والنظافة ",
    "scaleText": "ا5: أستثنائي.              4: فوق التوقعات              3: بمستوى التوقعات            2: اقل من المتوقع                1: غير مرضي",
    "sections": [
      {
        "number": 1,
        "title": "المهارات الفنية /المعرفة بالعمل/التطور المهني",
        "items": [
          {
            "num": 1,
            "text": "لديه المهارات الفنية والمهنية لكافة مسؤوليات ومتطلبات الوظيفة والقابلية لتعلم مهارات جديدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "يقدم الاقتراحات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "يوظف ادوات العمل بكفاءه ويستخدم الموارد بشكل فعال",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "الدقه والاتقان",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "تخطيط و تنظيم العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 6,
            "text": "اداء العمل بشكل مستقل مع الاشراف عند الحاجة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 7,
            "text": "الاستجابة للطلبات ضمن الجدول الزمني واحترام مواعيد الانجاز",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 8,
            "text": "متابعة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 9,
            "text": "ادارة الاولويات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 10,
            "text": "التعبير عن الافكار بطريقة واضحة وفعالة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 11,
            "text": "مهارات استماع وفهم جيدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 12,
            "text": "يبقي الاخرين على علم بشكل كاف",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 13,
            "text": "اظهار روح المبادرة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 14,
            "text": "الاستقامة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 15,
            "text": "قابل للتكييف مع التغييرات في بيئة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 16,
            "text": "يقبل النقد والتغذية العكسية",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 17,
            "text": "المساهمة بشكل فاعل مع فريق العمل لتحقيق النتائج المطلوبة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 18,
            "text": "تبادل الافكاروالاراء البناءه",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 19,
            "text": "يتولى مسؤوليات اضافية عند الحاجة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 20,
            "text": "يشجع الاحترام المتبادل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 21,
            "text": "الدقة في الحضور",
            "empScore": null,
            "mgrScore": null
          }
        ],
        "hasSubtotal": true,
        "subtotalRow": 32
      }
    ],
    "downloadUrl": "/templates/performance_appraisals/Maintenance%20Cleaner%20PA.xlsx",
    "hasLeadershipSection": false,
    "scoringType": "cleaner",
    "defaultGoals": [
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      }
    ],
    "defaultTrainings": [
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالمهارات",
        "party": "supervisor"
      },
      {
        "title": "",
        "type": "له علاقة بالمسار الوظيفي",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "supervisor"
      }
    ]
  },
  {
    "id": "pa-staff",
    "filename": "Staff PA.xlsx",
    "titleEn": "Staff Annual Performance Appraisal (FY-24)",
    "titleAr": "نموذج تقييم الأداء السنوي للموظفين (FY-24)",
    "defaultYear": "FY-24",
    "fullTitle": "Staff Annual Performance Appraisal (FY-24)\n FY-24 نموذج تقييم الأداء السنوي للموظفين ",
    "scaleText": "ا5: أستثنائي.              4: فوق التوقعات              3: بمستوى التوقعات            2: اقل من المتوقع                1: غير مرضي",
    "sections": [
      {
        "number": 1,
        "title": "المهارات الفنية /المعرفة بالعمل/التطور المهني",
        "items": [
          {
            "num": 1,
            "text": "لديه المهارات الفنية والمهنية لكافة مسؤوليات ومتطلبات الوظيفة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "مهارات تحليلية جيدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "يقدم الاقتراحات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "اثبات معرفته بسياسات و اجراءات وضيفته ، وفهمه لرسالة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "يوظف ادوات وموارد العمل بكفاءه",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 6,
            "text": "القابلية لتعلم مهارات جديدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 7,
            "text": "مواكبة التطورات الفنية",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 2,
        "title": "نوعية العمل",
        "items": [
          {
            "num": 1,
            "text": "الدقه والاتقان في تنظيم العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "اداء العمل بشكل مستقل مع الاشراف عند الحاجة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "النتائج النهائية تحتاج الى تدقيق و تصحيح بسيط",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "الاستجابة للطلبات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "متابعة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 6,
            "text": "تأدية المهام ضمن الجدول الزمني واحترام مواعيد الانجاز وادارة الاولويات",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 3,
        "title": "مهارات التواصل",
        "items": [
          {
            "num": 1,
            "text": "استخدام جميع قنوات التواصل المتاحة لتلبية متطلبات العمل عن بعد",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "التعبير عن الافكار شفهيا و كتابيا بطريقة واضحة وفعالة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "مهارات استماع وفهم جيدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "يبقي الاخرين على علم بشكل كاف عن طريق استخدام جميع قنوات الاتصال المتاحة",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 4,
        "title": "المهارات الخاصة بالعلاقات بين الاشخاص",
        "items": [
          {
            "num": 1,
            "text": "اظهار روح المبادرة والابتكار والابداع",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "يمكن الاتكال عليه في اتخاذ القرارات و الاستقلالية في الحكم فيما يخص المهام الموكلة اليه",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 5,
        "title": "التكيف/ المرونه",
        "items": [
          {
            "num": 1,
            "text": "قابل للتكيف مع التغييرات في بيئة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "القدرة على التكيف مع العمل عن بعد",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "المحافظة على بيئة عمل ايجابية خلال فترة الازمات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "يقبل النقد والتغذية العكسية",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 6,
        "title": "روح الفريق والتعاون",
        "items": [
          {
            "num": 1,
            "text": "المساهمة بشكل فاعل مع فريق العمل لتحقيق النتائج المطلوبة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "المساعدة في منع او حل النزاعات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "يوسع علاقات العمل الايجابية ويشجع عمل الفريق والتعاون",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "يتولى مسؤوليات اضافية عند الحاجة",
            "empScore": null,
            "mgrScore": null
          }
        ]
      },
      {
        "number": 7,
        "title": "المهنية, الاخلاق, الانضباط و التكييف مع معايير مؤسسة الاسكان التعاوني",
        "items": [
          {
            "num": 1,
            "text": "الدقة في الحضور",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "الحرص على تطبيق السياسات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "الاستقامة والدقة في السلوك المهني",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "يشجع و يعيش القيم الاساسية لمؤسسة الاسكان التعاوني",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "يشجع الاخلاق الجيدة والالتزام والاحترام المتبادل",
            "empScore": null,
            "mgrScore": null
          }
        ],
        "hasSubtotal": true,
        "subtotalRow": 49
      },
      {
        "number": 8,
        "title": "القيادة, تطوير الكادر (للمدراء والمشرفين فقط)",
        "items": [
          {
            "num": 1,
            "text": "التوجيه وشرح مهام العمل عن بعد بطريقة واضحة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "الاستفادة من مهارات الموظفين بكفاءة وانتاجية للوصول الى كل الأهداف المرجوة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "نقل المعرفة الى اقرانه و مرؤوسية",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "التعامل مع الصراعات بطريقة بناءه",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "يعمل على تطوير الموظفين وتحفيزهم",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 6,
            "text": "تطوير الحلول لمشاكل الموظفين الشخصية",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 7,
            "text": "انشاء بيئة موجهة نحو الاهداف الايجابية والمحافظة عليها خاصة في أوقات الازمات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 8,
            "text": "يدير ميزانية القسم بشكل ايجابي وفعال",
            "empScore": null,
            "mgrScore": null
          }
        ],
        "hasSubtotal": true,
        "subtotalRow": 60
      }
    ],
    "downloadUrl": "/templates/performance_appraisals/Staff%20PA.xlsx",
    "hasLeadershipSection": true,
    "scoringType": "staff",
    "defaultGoals": [
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      }
    ],
    "defaultTrainings": [
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالمهارات",
        "party": "supervisor"
      },
      {
        "title": "",
        "type": "له علاقة بالمسار الوظيفي",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "supervisor"
      }
    ]
  },
  {
    "id": "pa-team-leaders-guards",
    "filename": "Team Leaders-Guards PA.xlsx",
    "titleEn": "Team Leaders, Guards Annual Performance Appraisal (FY-25)",
    "titleAr": "نموذج تقييم الأداء لقائدي الفرق، الحرس (FY-25)",
    "defaultYear": "FY-25",
    "fullTitle": "Team Leaders, Guards Annual Performance Appraisal (FY-25 )\n (FY-25) نموذج تقييم الأداء لقائدي الفرق، الحرس ",
    "scaleText": "ا5: أستثنائي.              4: فوق التوقعات              3: بمستوى التوقعات            2: اقل من المتوقع                1: غير مرضي",
    "sections": [
      {
        "number": 1,
        "title": "المهارات الفنية /المعرفة بالعمل/التطور المهني",
        "items": [
          {
            "num": 1,
            "text": "لديه المهارات الفنية والمهنية لكافة مسؤوليات ومتطلبات الوظيفة والقابلية لتعلم مهارات جديدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "يقدم الاقتراحات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "يوظف ادوات العمل بكفاءه ويستخدم الموارد بشكل فعال",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "الدقه والاتقان",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 5,
            "text": "تخطيط و تنظيم العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 6,
            "text": "اداء العمل بشكل مستقل مع الاشراف عند الحاجة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 7,
            "text": "الاستجابة للطلبات ضمن الجدول الزمني واحترام مواعيد الانجاز",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 8,
            "text": "متابعة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 9,
            "text": "ادارة الاولويات",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 10,
            "text": "التعبير عن الافكار بطريقة واضحة وفعالة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 11,
            "text": "مهارات استماع وفهم جيدة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 12,
            "text": "يبقي الاخرين على علم بشكل كاف",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 13,
            "text": "اظهار روح المبادرة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 14,
            "text": "الاستقامة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 15,
            "text": "قابل للتكييف مع التغييرات في بيئة العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 16,
            "text": "يقبل النقد والتغذية العكسية",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 17,
            "text": "المساهمة بشكل فاعل مع فريق العمل لتحقيق النتائج المطلوبة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 18,
            "text": "تبادل الافكاروالاراء البناءه",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 19,
            "text": "يتولى مسؤوليات اضافية عند الحاجة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 20,
            "text": "يشجع الاحترام المتبادل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 21,
            "text": "الدقة في الحضور",
            "empScore": null,
            "mgrScore": null
          }
        ],
        "hasSubtotal": true,
        "subtotalRow": 32
      },
      {
        "number": 2,
        "title": "القيادة, تطوير الكادر (للمدراء والمشرفين فقط)",
        "items": [
          {
            "num": 1,
            "text": "ادارة فريق العمل بكفاءة",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 2,
            "text": "نقل المعرفة الى مرؤوسيه",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 3,
            "text": "التخطيط وتنظيم العمل",
            "empScore": null,
            "mgrScore": null
          },
          {
            "num": 4,
            "text": "تحفيز الكادر والحصول على الدعم من الاخرين",
            "empScore": null,
            "mgrScore": null
          }
        ],
        "hasSubtotal": true,
        "subtotalRow": 38
      }
    ],
    "downloadUrl": "/templates/performance_appraisals/Team%20Leaders-Guards%20PA.xlsx",
    "hasLeadershipSection": true,
    "scoringType": "team_leaders",
    "defaultGoals": [
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "employee"
      },
      {
        "goal": "",
        "weight": 0,
        "party": "supervisor"
      }
    ],
    "defaultTrainings": [
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالمهارات",
        "party": "supervisor"
      },
      {
        "title": "",
        "type": "له علاقة بالمسار الوظيفي",
        "party": "employee"
      },
      {
        "title": "",
        "type": "له علاقة بالعمل",
        "party": "supervisor"
      }
    ]
  }
];

import React from 'react';

export interface AnnexPageItem {
  pageNumber: number;
  documentTitle: string;
  documentKey: string;
  subTitle?: string;
  content: React.ReactNode;
}

export const getAnnexPages = (_employee?: any): AnnexPageItem[] => {
  const pages: AnnexPageItem[] = [
    // -------------------------------------------------------------
    // Page 5: التعهد 1 - الالتزام بضوابط سلوك العمل
    // -------------------------------------------------------------
    {
      pageNumber: 5,
      documentTitle: 'التعهد 1: الالتزام بضوابط سلوك العمل',
      documentKey: 'undertaking_1',
      subTitle: 'تعهد رقم (1)',
      content: (
        <div className="space-y-3.5 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد الالتزام بضوابط سلوك العمل</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">تعهد رقم (1)</div>
          </div>

          <p className="text-justify leading-relaxed">
            لضمان أعلى جودة للبرامج وأقل كلفة ممكنة، ولضمان عدالة وشفافية نشاطات <strong>مؤسسة CHF العراق</strong>، فإن كافة الموظفين ملزمين بقراءة والموافقة على الشروط التالية وبشكل سنوي. إن عدم الموافقة على البيانات التالية سيكون سبباً لإنهاء العمل. وبالإضافة لذلك، فإن الموظف الذي يوافق على هذه البيانات ولكنه يقوم بالتصرف خلافاً لما ورد فيها يعرض نفسه أيضاً للفصل.
          </p>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              الدفعات المالية غير القانونية أو الفاسدة أو غير المناسبة:
            </h4>
            <p className="text-justify leading-relaxed">
              تقديم أي عرض، استلام أي دفعة مالية، المحسوبية، التربح بأي شكل كان تعتبر تصرفاً غير قانوني وممارسة فاسدة، سواء بطريقة مباشرة أو غير مباشرة، وذلك على سبيل المكافأة لإحالة أي عطاء، سواء أكان عطاء بضائع أم خدمات أم عمالة. إن أي عمل من هذا القبيل سيتشكل أساساً لطرد الموظف فوراً، علاوة على اتخاذ الإجراءات المدنية والجنائية الأخرى بحقه وحسبما هو مطبق وساري المفعول. قبول أي مبلغ من المال أو هدايا من أجل إحالة عقد قرض على زبون أو تسهيل صرف قرض أو أخذ مبلغ القرض من الزبون المقترض سوف يتسبب بإنهاء عقد الموظف فوراً من المؤسسة.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              تضارب المصالح:
            </h4>
            <p className="text-justify leading-relaxed">
              من أجل تجنب حدوث أي تصرف غير لائق من CHF العراق، فإن كافة الموظفين يشهدون بأنه ليس لديهم أية مصالح، سواء أكانت مباشرة أم غير مباشرة، مع أي من الأشخاص أو الشركات التي ترتبط بمشاريع مع CHF العراق. إن وجود علاقات كعلاقات الصداقة أو القرابة مع أي فرد من المجتمعات أو الشركات العاملة مع CHF العراق يجب أن يتم التصريح به قبل التفكير بالعمل مع تلك الجماعات أو الأفراد أو الوحدات. وتبقى هذه الحقيقة سارية المفعول حتى لو أن الموظف الذي يعمل لدى CHF العراق ليس مرتبطاً مباشرة بالبرنامج أو ليس له سلطة اتخاذ القرار بشأن البرنامج. إن عدم التصريح بهذه العلاقات أو اختلاف النوايا سيتشكل أساساً للطرد والإجراءات المدنية أو الجنائية الأخرى بحقه وحسبما هو مطبق وساري المفعول.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              دفع مبلغ لغرض التعيين (رشوة):
            </h4>
            <p className="text-justify leading-relaxed">
              يتعهد الموظف/الموظفة وذلك بالتوقيع أسفل هذه الصفحة بأنه/بأنها لم يقم/تقم بدفع أي مبلغ كرشوة لأي موظف عامل في المؤسسة لغرض تسهيل عملية تعيينه/تعيينها في المؤسسة أو تفضيله/تفضيلها على الآخرين من المقدمين على طلب العمل.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              شهادة:
            </h4>
            <p className="text-justify leading-relaxed">
              إن الموظف المبين أدناه يشهد بموجب هذه الوثيقة بأنه قد قام بقراءتها ويفهم بشكل تام كل ما ورد فيها. وعلاوة على ذلك، فإنه يوافق على محتوياتها ويشهد بموجب ذلك بأنه لم يقم باستلام أو تسليم أية دفعة مالية أو مصالح أخرى وأنه لا يوجد عنده حالياً أو في المستقبل أية حالة تضارب في المصالح.
            </p>
          </div>

          <div className="pt-6 border-t-2 border-slate-900 mt-auto">
            <div className="text-xs sm:text-[13px] font-bold text-slate-900 mb-2">المتعهد:</div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:text-[13px]">
              <div><span className="font-bold">الاسم:</span> ................................................................</div>
              <div><span className="font-bold">العنوان الوظيفي:</span> ................................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
              <div><span className="font-bold">التوقيع:</span> ................................................................</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 6: التعهد 2 - سرية المعلومات وعدم الإفصاح (صفحة 1)
    // -------------------------------------------------------------
    {
      pageNumber: 6,
      documentTitle: 'التعهد 2: سرية المعلومات وعدم الإفصاح (1/2)',
      documentKey: 'undertaking_2_p1',
      subTitle: 'تعهد رقم (2) - صفحة 1 من 2',
      content: (
        <div className="space-y-3 text-xs sm:text-[12.5px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-1.5 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد سرية المعلومات وعدم الإفصاح</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">تعهد رقم (2)</div>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-2.5 rounded-lg space-y-1">
            <p className="m-0">
              أقر أنا / .......................................................................... والثابت الشخصية بموجب البيانات أدناه:
            </p>
            <p className="m-0">
              جواز السفر / هوية شخصية / بطاقة وطنية رقم: ................................. صادرة من: ............................. بتاريخ: ...............
            </p>
            <p className="m-0">
              وحيث إني التحقت بالعمل لدى مؤسسة الإسكان التعاونية CHF، اعتباراً من تاريخ: ...... / ..... / ............
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13px]">
              أولاً: الإقرار بحظر تعيين الأقارب:
            </h4>
            <p className="text-justify m-0">
              كما أتعهد بأني ليس لي أقارب من الدرجة الأولى والثانية يعملون في نفس هذه المؤسسة، وفي حالة وجود خلاف ذلك فإني ملزم بإدراج المعلومات التالية عن أقاربي في الجدول أدناه:
            </p>
            <table className="w-full border-collapse border border-slate-400 text-[11px] mt-1 text-center">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-slate-400 p-1 w-8">ت</th>
                  <th className="border border-slate-400 p-1">اسم القريب</th>
                  <th className="border border-slate-400 p-1">درجة القرابة</th>
                  <th className="border border-slate-400 p-1">موقع عمله</th>
                  <th className="border border-slate-400 p-1">العنوان الوظيفي</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-slate-400 p-1.5">1</td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td></tr>
                <tr><td className="border border-slate-400 p-1.5">2</td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td></tr>
                <tr><td className="border border-slate-400 p-1.5">3</td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td><td className="border border-slate-400 p-1.5"></td></tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13px]">
              ثانياً: إقرار عدم استلاف قرض:
            </h4>
            <p className="text-justify m-0">
              في حال كان تعاقدي مع مؤسسة الإسكان التعاونية هو عقدي الأول (السنة الأولى من العمل)، فإني أتعهد بأني لم أستلف أي قرض لا زال فعالاً وباقٍ بذمتي جميعه أو جزء منه من المؤسسة المذكورة أعلاه.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13px]">
              ثالثاً: التعهد بالحفاظ على السرية:
            </h4>
            <p className="text-justify m-0">
              وترتب على التحاقي بالعمل لدى المؤسسة الاطلاع على معلومات وأسرار تخص المؤسسة وعملائها، وسياسات تنظيم العمل الداخلي لديه مما يجعل جميع المعلومات التي أطلع عليها بحكم علاقة العمل بيني وبين المؤسسة تتسم بالسرية والتي لا يجوز الإفصاح عنها لأي طرف آخر، وبناءً عليه فإني أقر وأتعهد وألتزم بالمحافظة على سرية جميع المعلومات التي يتم تداولها داخل المؤسسة أو بينها وبين أي أطراف أخرى مهما كانت وعدم الإفصاح عن تلك المعلومات. ويشمل نطاق السرية هذا على سبيل المثال وليس الحصر ما يلي:
            </p>
            <p className="text-justify m-0 pl-1">
              <strong>1- المعلومات غير المفصح عنها:</strong> سواء كانت خاصة بالمؤسسة و/أو عملائها والتي تتصف بالسرية لكونها غير معروفة أو غير متداولة بشكل عام في مجال العمل و/أو كانت تستمد قيمتها التجارية من كونها سرية أو تعتمد في سريتها على ما يتخذه المؤسسة من إجراءات فعالة للحفاظ عليها.
            </p>
            <p className="text-justify m-0 pl-1">
              <strong>2- كل المعلومات المتعلقة بخطط ونظم التسويق:</strong> أسماء وبيانات العملاء الحاليين أو المستهدفين، نظم التسعير، قاعدة بيانات المؤسسة، البيانات المالية غير المنشورة، حسابات المؤسسة، بيانات العاملين ورواتبهم، الدورة المستندية، اللوائح الداخلية والدعاوى والمطالبات.
            </p>
            <p className="text-justify m-0 pl-1">
              <strong>3- وسائل التواصل الاجتماعي:</strong> يحظر على الموظف القيام بالأمور والأنشطة التالية دون الحصول على موافقة رسمية ونافذة من قبل إدارة المؤسسة (يتبع في الصفحة التالية)...
            </p>
          </div>

          <div className="pt-3 border-t border-dashed border-slate-400 mt-auto flex justify-between items-center text-[11px] text-slate-600">
            <div>المتعهد: ................................................</div>
            <div>التوقيع: ................................................</div>
            <div className="stamp-box border border-dashed border-slate-500 rounded px-2 py-0.5 font-bold">ختم المؤسسة</div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 7: التعهد 2 - سرية المعلومات وعدم الإفصاح (صفحة 2)
    // -------------------------------------------------------------
    {
      pageNumber: 7,
      documentTitle: 'التعهد 2: سرية المعلومات وعدم الإفصاح (2/2)',
      documentKey: 'undertaking_2_p2',
      subTitle: 'تعهد رقم (2) - صفحة 2 من 2',
      content: (
        <div className="space-y-3.5 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد سرية المعلومات وعدم الإفصاح (تابع)</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">تعهد رقم (2) - الصفحة الثانية</div>
          </div>

          <div className="space-y-1.5 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13px]">
              تكملة (3) محظورات وسائل التواصل الاجتماعي:
            </h4>
            <p className="text-justify m-0">
              <strong>أ.</strong> الاشتراك أو المشاركة في أي مجموعات (جروبات) أو صفحات وسائل التواصل الاجتماعي المختلفة، بهدف التواصل أو التعليق أو التأثير أو الترويج لأعمال ونشاط المؤسسة دون إذن رسمي.
            </p>
            <p className="text-justify m-0">
              <strong>ب.</strong> النشر أو التعليق فيما يخص المؤسسات ذات النشاط المماثل من خلال وسائل التواصل الاجتماعي المختلفة بما قد يلحق ضرراً بنشاط وأعمال المؤسسة.
            </p>
            <p className="text-justify m-0">
              <strong>ج.</strong> إخفاء الموظف رغم معرفته عن وجود أي من المجموعات (جروبات) الواردة في أعلاه، تم اشتراك الموظفين بها قبل توقيع هذا التعهد، ليتخذ القرار المناسب من الإدارة من غلقها أو بقائها.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-justify m-0">
              <strong>4- أجهزة الحاسوب الشخصية:</strong> يمنع على الموظف جلب أية أجهزة حاسوب (لابتوب) أو أجهزة لوحية ذكية (تابلت) الشخصية إلى موقع العمل أو استخدامها لأغراض تتعلق بأعمال المؤسسة، كما يمنع منعاً باتاً من تداول المعلومات أو نقل أي منها إلى الأجهزة الخاصة به أو للغير دون موافقة رسمية من إدارة المؤسسة.
            </p>
            <p className="text-justify m-0">
              <strong>5- التصوير:</strong> يمنع على الموظف تصوير أي من مكاتب المؤسسة، أو موجوداتها أو موظفيها دون الحصول على موافقة رسمية ونافذة من قبل إدارة المؤسسة.
            </p>
            <p className="text-justify m-0">
              <strong>6- مشاركة المعلومات الشخصية:</strong> يمنع على الموظفين تداول أو مشاركة أي معلومات شخصية أو بيانات خاصة بزملائهم في العمل، سواء داخل القسم أو المؤسسة، إلا في حدود ما تقتضيه طبيعة العمل والمهام الوظيفية.
            </p>
            <p className="text-justify m-0">
              <strong>7- استخدام الهوية التعريفية:</strong> يمنع على الموظف من استخدام الهوية التعريفية الخاصة بالمؤسسة في غير الأعمال المناطة بالغرض الذي من أجله زود بهذه الهوية.
            </p>
          </div>

          <div className="space-y-1.5 border-t border-slate-300 pt-2">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              رابعاً: عقوبات عدم الامتثال:
            </h4>
            <p className="text-justify m-0">
              وفي حالة اكتشاف المؤسسة مخالفتي أو عدم امتثالي لأي من البنود المذكورة أعلاه بعد تاريخ توقيع هذا التعهد:
            </p>
            <p className="text-justify m-0">
              <strong>1- في حالة كوني مستمراً بالعمل:</strong> فإنه يحق للمؤسسة إلغاء عقد العمل مباشرة وبدون أي إنذار مسبق.
            </p>
            <p className="text-justify m-0">
              <strong>2- في حالة كوني تاركاً للعمل أو مستقيلاً أو منقطع العلاقة مع المؤسسة:</strong> فإني أقر بدفع التعويضات اللازمة والتي تقدرها المؤسسة بسبب الأضرار التي لحقت بنشاط أو أعمال المؤسسة.
            </p>
          </div>

          <div className="pt-6 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-3 gap-4 text-xs sm:text-[13px]">
              <div><span className="font-bold">الاسم:</span> ................................................</div>
              <div><span className="font-bold">التوقيع:</span> ................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 8: التعهد 3 - تعهد سياسات وإجراءات المؤسسة الداخلية
    // -------------------------------------------------------------
    {
      pageNumber: 8,
      documentTitle: 'التعهد 3: سياسات وإجراءات المؤسسة الداخلية',
      documentKey: 'undertaking_3',
      subTitle: 'تعهد رقم (3) - عند التوظيف بعد التدريب',
      content: (
        <div className="space-y-3.5 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد سياسات وإجراءات المؤسسة الداخلية</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">تعهد رقم (3) - توقّع بعد إتمام التدريب</div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              إقرار استلام وفهم السياسات والإجراءات الداخلية:
            </h4>
            <p className="text-justify leading-relaxed">
              تم إعداد المواد المؤسسية في <strong>CHF VITAS</strong>، بما في ذلك دليل الموظف، ومدونة قواعد السلوك، ودليل السياسات والإجراءات الخاصة بالإدارة/القسم، والتدريب المتعلق بقواعد السلوك وأخلاقيات العمل، بهدف تزويد الموظفين بمعلومات أساسية حول قيم المؤسسة، سياساتها، إجراءاتها، وممارساتها.
            </p>
            <p className="text-justify leading-relaxed">
              تُعد هذه المواد مرجعاً شاملاً يساعد الموظف على فهم مسؤولياته وتوقعات المؤسسة منه، ويُشكل أساساً للامتثال المؤسسي وتعزيز بيئة عمل قائمة على النزاهة والشفافية.
            </p>
          </div>

          <div className="space-y-2 bg-slate-50 border border-slate-200 p-3 rounded-xl">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13.5px]">
              بيان التعهد:
            </h4>
            <p className="m-0">
              أنا، ..........................................................................، أقرّ بأنني:
            </p>
            <ul className="space-y-1.5 list-disc list-inside text-justify pr-2">
              <li>حضرت تدريب التوجيه والتعريف المؤسسي، وأفهم من خلاله الهيكل التنظيمي، السياسات العامة، إجراءات العمل، وثقافة المؤسسة.</li>
              <li>استلمت وقرأت وفهمت دليل موظف مؤسسة الإسكان التعاونية، بما يتضمنه من أهداف المؤسسة، سياساتها، مزاياها، ممارساتها، وتوقعاتها، بالإضافة إلى مسؤولياتي كموظف.</li>
              <li>اطّلعت على مدونة السلوك المهني وأفهم المبادئ والقيم التي تقوم عليها، وألتزم بالتصرف وفقاً لها.</li>
              <li>قرأت وفهمت دليل السياسات والإجراءات الخاصة بالإدارة/القسم الذي أعمل فيه.</li>
              <li>شاركت في تدريب السلوك المهني والأخلاقيات المؤسسية وأفهم التزاماتي الأخلاقية والسلوكية في بيئة العمل.</li>
            </ul>
          </div>

          <p className="text-justify leading-relaxed">
            وبموجب توقيعي أدناه، أقرّ بأنني على دراية كاملة بالسياسات والإجراءات المعتمدة في مؤسسة الإسكان التعاونية، وأوافق على الالتزام بها طوال فترة عملي. كما أفهم أن المؤسسة تحتفظ بحق تعديل أي من السياسات أو الإجراءات وفقاً لما تراه مناسباً أو حسب ما تقتضيه القوانين المعمول بها، على أن يتم إعلامي بذلك حسب قنوات التواصل المعتمدة من المؤسسة.
          </p>

          <p className="text-justify leading-relaxed text-slate-700 bg-teal-50/50 p-2 border border-teal-200/50 rounded-lg">
            نشكر التزامكم الصادق وحرصكم على الاطلاع على القوانين، السياسات، والإجراءات المعتمدة. إن وعيكم بهذه المرجعيات المؤسسية والتزامكم بتطبيقها يعكس روح المسؤولية والمهنية، ويساهم في توفير أفضل بيئة عمل ممكنة تقوم على الشفافية، النزاهة، والاحترام المتبادل.
          </p>

          <div className="pt-4 border-t-2 border-slate-900 mt-auto space-y-2">
            <div className="text-xs">يرجى إعادة هذا الإقرار الموقع قبل تاريخ: ...... / ..... / ............</div>
            <div className="grid grid-cols-3 gap-4 text-xs sm:text-[13px]">
              <div><span className="font-bold">اسم الموظف:</span> ................................................</div>
              <div><span className="font-bold">توقيع الموظف:</span> ................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 9: تعهد تفرغ وظيفي 2026
    // -------------------------------------------------------------
    {
      pageNumber: 9,
      documentTitle: 'تعهد تفرغ وظيفي (2026)',
      documentKey: 'undertaking_full_time',
      subTitle: 'تعهد وإقرار بالتفرغ الوظيفي',
      content: (
        <div className="space-y-4 text-xs sm:text-[13.5px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد وإقرار بالتفرغ الوظيفي</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">مؤسسة الإسكان التعاونية CHF</div>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-3.5 rounded-xl space-y-2">
            <div className="font-bold text-slate-900">أنا الموقع أدناه:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div><span className="font-bold">الاسم الكامل:</span> ................................................</div>
              <div><span className="font-bold">العنوان الوظيفي:</span> ................................................</div>
              <div><span className="font-bold">الفرع:</span> ................................................</div>
            </div>
          </div>

          <p className="text-justify leading-relaxed">
            أقرّ وأتعهد بأنني، بتاريخ توقيع هذا التعهد، لا أزاول أي وظيفة أو عمل مهني أو تجاري آخر غير وظيفتي في <strong>مؤسسة الإسكان التعاونية (CHF)</strong>. كما أتعهد بالتفرغ لأداء واجباتي ومسؤولياتي الوظيفية لدى المؤسسة وتخصيص ساعات الدوام الرسمي بالكامل لتنفيذ المهام والمتطلبات المرتبطة بمنصبي، بدقة وأمانة وكفاءة، وفقاً لعقد العمل والوصف الوظيفي والسياسات والتعليمات المعتمدة لدى المؤسسة.
          </p>

          <p className="text-justify leading-relaxed">
            كما أتعهد، طوال مدة عملي لدى المؤسسة، بعدم أداء أي عمل لمصلحة الغير خلال ساعات الدوام الرسمي، وبعدم ممارسة أي نشاط خارجي من شأنه التأثير في حضوري أو أدائي أو جاهزيتي لتنفيذ واجباتي، أو أن يؤدي إلى تعارض في المصالح مع المؤسسة.
          </p>

          <p className="text-justify leading-relaxed">
            أخيراً، أقرّ بأن جميع المعلومات الواردة في هذا التعهد صحيحة وكاملة، وأتحمل المسؤولية عن تقديم أي معلومات غير صحيحة. وبخلاف ذلك يحق للمؤسسة اتخاذ الإجراءات المناسبة وفقاً للقانون وعقد العمل والسياسات والأنظمة الداخلية المعتمدة.
          </p>

          <div className="pt-10 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-3 gap-4 text-xs sm:text-[13.5px]">
              <div><span className="font-bold">الاسم:</span> ................................................</div>
              <div><span className="font-bold">التوقيع:</span> ................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 10: التعهد 5 - تعهد خاص بالأعمال (مسؤول قروض 5-ب)
    // -------------------------------------------------------------
    {
      pageNumber: 10,
      documentTitle: 'التعهد 5: تعهد خاص بالأعمال (مسؤول قروض)',
      documentKey: 'undertaking_5',
      subTitle: 'تعهد رقم (5-ب)',
      content: (
        <div className="space-y-2.5 text-xs sm:text-[12.5px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-1.5 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">تعهد خاص بالأعمال - تعهد مسؤول قروض</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">تعهد رقم (5-ب)</div>
          </div>

          <p className="text-justify leading-relaxed m-0">
            إني _________________________________ المنتسب في مؤسسة الإسكان التعاونية CHF، أتعهد بالالتزام بكافة سياسات المؤسسة خصوصاً عدم ارتكاب أي حالة من الحالات المدرجة أدناه وبخلافه فإنني أوافق على أن المؤسسة ستقوم بإنهاء عقد العمل الخاص بي مباشرة وبدون أي إنذار مسبق بالإضافة إلى تحملي كافة التبعات القانونية المترتبة من جراء المخالفة.
          </p>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 underline text-xs sm:text-[13px]">
              أولاً: الحالات المحظور استخدامها من قبل مسؤول القروض:
            </h4>
            <ol className="space-y-1 list-decimal list-inside text-justify pr-1 text-[11.5px] sm:text-[12px]">
              <li>حالات التزوير بكل أنواعها من تزوير أو قبول وثائق مزورة من المستمسكات الشخصية أو تأييد الراتب للمقترض أو الكفيل.</li>
              <li>التعامل مع الوسطاء مقابل أي منفعة يتقاضوها لترويج معاملات القروض والكفالات أو حتى في السدادات.</li>
              <li>جلب أو اعتماد كفلاء غير معروفين أو غير مقدمين من قبل المقترض.</li>
              <li>ترويج أو تسيير أو تقديم القروض الوهمية بكل أنواعها.</li>
              <li>ملء معلومات غير صحيحة في طلب القرض وبصورة متعمدة.</li>
              <li>استحصال أي أجور مادية أو غير مادية من المقترضين بالشكل الذي يخالف قواعد السلوك في سياسة المؤسسة على سبيل المثال (أجور النقل، كارتات الموبايل، أو أي أمور أخرى مثل أخذ بضاعة من محل المقترض بدون مقابل أو بمقابل لكن بأجور قليلة جداً أو بتأخير الدفع، .... الخ).</li>
              <li>إنجاز معاملات القروض للأقارب من الدرجة الأولى والثانية من قبل الموظف نفسه.</li>
              <li>المشاركة كلياً أو جزئياً بالانتفاع بصورة غير مباشرة من أي قروض مقدمة إلى عملاء المؤسسة.</li>
              <li>استلام أي مبالغ نقدية من المقترضين أو الكفلاء أو غيرهم دون وجود تخويل رسمي وفعال صادر من قبل إدارة المؤسسة.</li>
              <li>الترويج أو التعامل بأي صيغة مع المؤسسات المنافسة بما يتعارض مع سياسات المؤسسة.</li>
              <li>الإضرار بسمعة المؤسسة باستخدام تعاملات غير قانونية و/أو لا تتفق مع سياسات المؤسسة ومبادئها وقيمها.</li>
              <li>التعامل بعد الاستقالة أو ترك العمل مع عملاء المؤسسة بأي شكل أو علاقة قد تضر بمصالح المؤسسة.</li>
            </ol>
          </div>

          <div className="pt-4 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-3 gap-4 text-xs sm:text-[13px]">
              <div><span className="font-bold">اسم المتعهد:</span> ................................................</div>
              <div><span className="font-bold">توقيع المتعهد:</span> ................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 11: الاستمارة الطبية - Personal Medical Details
    // -------------------------------------------------------------
    {
      pageNumber: 11,
      documentTitle: 'الاستمارة الطبية: معلومات طبية شخصية',
      documentKey: 'medical_form',
      subTitle: 'Personal Medical Details',
      content: (
        <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">Personal Medical Details / معلومات طبية شخصية</h2>
            <div className="text-xs font-semibold text-slate-600 mt-0.5">
              To be submitted to the Security Office by all staff / تقدم إلى قسم الأمن من قبل كل موظف
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-3.5 space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="font-bold">ألاسم / Name:</span>{' '}
                ....................................................................
              </div>
              <div>
                <span className="font-bold">ألموقع ألوظيفي / Position:</span>{' '}
                ....................................................................
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="font-bold">الفرع ومكان العمل / Branch:</span>{' '}
                ....................................................................
              </div>
              <div>
                <span className="font-bold">صنف ألدم / Blood Group:</span>{' '}
                ....................................................................
              </div>
            </div>
            <div className="pt-2">
              <span className="font-bold block mb-1">
                حالات ألحساسية أو الامراض المصاب بها ألموظف / Allergies & known medical Condition:
              </span>
              <div className="border border-dashed border-slate-400 rounded-lg p-3 bg-white min-h-[75px] text-slate-400 text-xs">
                ............................................................................................................................................................................................................................................................................................................................................................
              </div>
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-3.5 space-y-3 bg-slate-50">
            <div className="border-b border-slate-200 pb-1.5">
              <h4 className="font-bold text-slate-900 text-xs sm:text-[13px] m-0">
                (Who to advise in a Medical Emergency or in case of death)
              </h4>
              <div className="text-[12px] font-semibold text-slate-700">
                (الشخص الذي يجب الاتصال به في حالة حدوث طاريء صحي للموظف أو عند حدوث ألوفاة)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="font-bold">أسم ألقريب / Next of Kin:</span>{' '}
                ....................................................................
              </div>
              <div>
                <span className="font-bold">نوع ألقرابة / ألعلاقة / Relationship:</span>{' '}
                ....................................................................
              </div>
            </div>

            <div className="pt-1">
              <span className="font-bold block mb-1">
                كيفية الاتصال به (العنوان الدقيق / الهاتف) / Contact Detail:
              </span>
              <div className="border border-dashed border-slate-400 rounded-lg p-3 bg-white space-y-2 text-xs">
                <div>
                  <span className="font-bold">رقم الهاتف / Phone:</span>{' '}
                  ........................................................................................
                </div>
                <div>
                  <span className="font-bold">العنوان الدقيق / Address:</span>{' '}
                  ........................................................................................
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-2 gap-4 text-xs sm:text-[13px]">
              <div>
                <span className="font-bold">توقيع الموظف / Employee Signature:</span>{' '}
                ................................................
              </div>
              <div>
                <span className="font-bold">التاريخ / Date:</span>{' '}
                ...... / ..... / ............
              </div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 12: المستفيدين من التأمين على الحياة
    // -------------------------------------------------------------
    {
      pageNumber: 12,
      documentTitle: 'المستفيدين من التأمين: التأمين على الحياة',
      documentKey: 'insurance_beneficiaries',
      subTitle: 'نموذج تفويض المستفيدين',
      content: (
        <div className="space-y-4 text-xs sm:text-[13.5px] leading-relaxed text-slate-900 font-['Cairo',sans-serif]">
          <div className="text-center pb-2 border-b border-slate-200">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 m-0">نموذج تحديد المستفيدين من التأمين على الحياة</h2>
            <div className="text-xs font-bold text-slate-700 mt-0.5">مؤسسة الإسكان التعاونية CHF</div>
          </div>

          <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl">
            <p className="text-justify leading-relaxed m-0 text-xs sm:text-[13.5px]">
              اني &quot; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &quot; &quot; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &quot; في مكتب &quot; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &quot; ، اخول الاشخاص المدرجة اسماؤهم ادناه مع النسب المئوية المذكورة ازاء كل منهم، لاستلام مبلغ التامين على الحياة في حالة وفاتي، وعليه وقعت..
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-xs sm:text-[13.5px]">جدول توزيع نسب المستفيدين:</h4>
            <table className="w-full border-collapse border border-slate-400 text-xs sm:text-[13px] text-center">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-slate-400 p-2 w-10">ت</th>
                  <th className="border border-slate-400 p-2 text-right">الاسم / الاسماء الثلاثية للمستفيدين من التامين</th>
                  <th className="border border-slate-400 p-2 w-48">نوع القرابة مع المؤمن</th>
                  <th className="border border-slate-400 p-2 w-32">النسبة المئوية (%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-400 p-3 font-bold">1</td>
                  <td className="border border-slate-400 p-3 text-right"></td>
                  <td className="border border-slate-400 p-3"></td>
                  <td className="border border-slate-400 p-3 font-mono"></td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-3 font-bold">2</td>
                  <td className="border border-slate-400 p-3 text-right"></td>
                  <td className="border border-slate-400 p-3"></td>
                  <td className="border border-slate-400 p-3 font-mono"></td>
                </tr>
                <tr>
                  <td className="border border-slate-400 p-3 font-bold">3</td>
                  <td className="border border-slate-400 p-3 text-right"></td>
                  <td className="border border-slate-400 p-3"></td>
                  <td className="border border-slate-400 p-3 font-mono"></td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={3} className="border border-slate-400 p-2.5 text-left pl-4">المجموع:</td>
                  <td className="border border-slate-400 p-2.5 font-mono text-emerald-700 font-bold">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-10 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-3 gap-4 text-xs sm:text-[13.5px]">
              <div><span className="font-bold">اسم الموظف الثلاثي:</span> ................................................</div>
              <div><span className="font-bold">التاريخ:</span> ...... / ..... / ............</div>
              <div><span className="font-bold">التوقيع:</span> ................................................</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 13: Income Tax (1/2) - الاستقطاع المباشر لضريبة الدخل
    // -------------------------------------------------------------
    {
      pageNumber: 13,
      documentTitle: 'Income Tax: ضريبة الدخل (1/2)',
      documentKey: 'income_tax_p1',
      subTitle: 'الاستمارة رقم (أ/4 د.ض) - الاستقطاع المباشر',
      content: (
        <div className="space-y-2.5 text-xs sm:text-[11.5px] leading-tight text-slate-900 font-['Cairo',sans-serif]">
          <div className="flex justify-between items-start border-b border-slate-300 pb-1.5">
            <div className="text-right">
              <div className="font-bold text-xs">جمهورية العراق</div>
              <div className="font-bold text-xs">وزارة المالية</div>
              <div className="font-bold text-xs">الهيئة العامة للضرائب</div>
              <div className="text-[10px] text-slate-600">قسم الاستقطاع المباشر</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-sm sm:text-base border border-slate-800 px-3 py-1 rounded bg-slate-100">
                الاستمارة رقم (أ/4 د.ض)
              </div>
              <div className="text-[10px] font-bold mt-1 text-slate-700">
                خاصة بالمنتسبين الخاضعين للضريبة بطريقة الاستقطاع المباشر
              </div>
            </div>
            <div className="text-left text-[11px] space-y-0.5">
              <div>السنة المالية: <strong>202.....</strong></div>
              <div>الصفحة: <strong>1 من 2</strong></div>
            </div>
          </div>

          {/* Section 1: المنتسب */}
          <div className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 underline text-xs">١- بيانات المنتسب:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>اسم المنتسب الكامل: ___________________________</div>
              <div>تاريخ الميلاد: ___________________________</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>رقم هوية الأحوال المدنية / البطاقة: _________________</div>
              <div>الجنسية: _________________ | مقيم في العراق: [ ] نعم   [ ] كلا</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>عنوان السكن: محافظة: ________ مدينة: ________ محلة: ________</div>
              <div>هاتف: _________________ بريد إلكتروني: _________________</div>
            </div>
          </div>

          {/* Section 2: الوظيفة وصاحب العمل */}
          <div className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1.5">
            <div className="font-bold text-slate-900 underline text-xs">٢- بيانات الوظيفة وجهة العمل:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>العنوان الوظيفي: ___________________________</div>
              <div>اليوم الأول لبدء العمل: ___________________________</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>اسم صاحب العمل: <strong>مؤسسة الإسكان التعاونية CHF</strong></div>
              <div>هل صاحب العمل هو الرئيسي؟ [ ] نعم   [ ] كلا</div>
            </div>
            <div>الرقم التعريفي لصاحب العمل: ___________________________</div>
          </div>

          {/* Section 3: الحالة الاجتماعية */}
          <div className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 underline text-xs">٣- الحالة الاجتماعية:</div>
            <div className="flex gap-4">
              <label className="flex items-center gap-1 font-semibold">
                <input type="checkbox" readOnly /> أعزب
              </label>
              <label className="flex items-center gap-1 font-semibold">
                <input type="checkbox" readOnly /> متزوج
              </label>
              <label className="flex items-center gap-1 font-semibold">
                <input type="checkbox" readOnly /> أرمل
              </label>
              <label className="flex items-center gap-1 font-semibold">
                <input type="checkbox" readOnly /> مطلق
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>أ. إذا كان متزوجاً: اسم الزوجة (الزوج): _________________</div>
              <div>تاريخ الزواج: _________________</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>ب. إذا كان مطلقاً: تأريخ الطلاق: _________________</div>
              <div>ج. إذا كان أرملاً: تاريخ وفاة الزوجة (الزوج): _________________</div>
            </div>
          </div>

          {/* Section 4: الأولاد */}
          <div className="border border-slate-300 p-2 rounded bg-slate-50 space-y-1">
            <div className="font-bold text-slate-900 underline text-xs">٤- معلومات حول الأولاد الذين يحق للمنتسب طلب السماح القانوني عنهم:</div>
            <table className="w-full border-collapse border border-slate-400 text-[10px] text-center">
              <thead>
                <tr className="bg-slate-200 font-bold">
                  <th className="border border-slate-400 p-1 w-6">ت</th>
                  <th className="border border-slate-400 p-1">اسم الولد أو البنت</th>
                  <th className="border border-slate-400 p-1 w-14">الجنس</th>
                  <th className="border border-slate-400 p-1 w-24">رقم الهوية المدنية</th>
                  <th className="border border-slate-400 p-1 w-20">تاريخ الميلاد</th>
                  <th className="border border-slate-400 p-1 w-24">سبب السماح القانوني</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-slate-400 p-1">1</td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td></tr>
                <tr><td className="border border-slate-400 p-1">2</td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td></tr>
                <tr><td className="border border-slate-400 p-1">3</td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td><td className="border border-slate-400 p-1"></td></tr>
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t-2 border-slate-900 mt-auto">
            <div className="text-[10.5px] text-justify text-slate-700 mb-1.5">
              إني الموقع أدناه، أقر أن البيانات المسجلة في هذه الاستمارة صحيحة ودقيقة بحسب معلوماتي وأتحمل المسؤولية القانونية خلاف ذلك.
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="font-bold">توقيع الموظف:</span> ____________________________________</div>
              <div><span className="font-bold">التاريخ:</span> ______ / _____ / 202...</div>
            </div>
          </div>
        </div>
      )
    },

    // -------------------------------------------------------------
    // Page 14: Income Tax (2/2) - حساب ضريبة الدخل
    // -------------------------------------------------------------
    {
      pageNumber: 14,
      documentTitle: 'Income Tax: ضريبة الدخل (2/2)',
      documentKey: 'income_tax_p2',
      subTitle: 'حساب ضريبة الدخل - الاستمارة (أ/4 د.ض)',
      content: (
        <div className="space-y-3 text-xs sm:text-[11.5px] leading-tight text-slate-900 font-['Cairo',sans-serif]">
          <div className="flex justify-between items-start border-b border-slate-300 pb-1.5">
            <div className="text-right">
              <div className="font-bold text-xs">جمهورية العراق - الهيئة العامة للضرائب</div>
              <div className="text-[10px] text-slate-600">قسم الاستقطاع المباشر</div>
            </div>
            <div className="text-center font-bold text-xs sm:text-sm">
              حساب ضريبة الدخل (تُملأ من قبل المحاسب في نهاية السنة)
            </div>
            <div className="text-left text-[11px]">
              <div>الاستمارة: <strong>أ/4 د.ض</strong></div>
              <div>الصفحة: <strong>2 من 2</strong></div>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-xs">جدول احتساب إجمالي الدخل والتنزيلات القانونية:</h4>
            <table className="w-full border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-slate-200 font-bold text-center">
                  <th className="border border-slate-400 p-1 w-10">الرمز</th>
                  <th className="border border-slate-400 p-1 text-right">البيان</th>
                  <th className="border border-slate-400 p-1 w-32">المبلغ (دينار عراقي)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">1-أ</td><td className="border border-slate-400 p-1">مجموع الرواتب والأجور المدفوعة خلال السنة</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">1-ب</td><td className="border border-slate-400 p-1">مجموع المخصصات (نقل، طعام، إقامة، سكن، ملابس، خطورة)</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">1-ج</td><td className="border border-slate-400 p-1">مجموع المخصصات والمزايا الأخرى الخاضعة للضريبة</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">1-د</td><td className="border border-slate-400 p-1">مزايا عينية ومكافآت أخرى مدفوعة للمنتسب</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr className="bg-slate-100 font-bold"><td className="border border-slate-400 p-1 text-center font-mono">(1)</td><td className="border border-slate-400 p-1">إجمالي الدخل الخاضع للاحتساب</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">2-أ</td><td className="border border-slate-400 p-1">مجموع السماح القانوني المستحق خلال السنة</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">2-ب</td><td className="border border-slate-400 p-1">التوقيفات التقاعدية وحصة الضمان الاجتماعي المدفوعة</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 text-center font-mono">2-ج</td><td className="border border-slate-400 p-1">التنزيلات الواردة في المادة (8) من قانون ضريبة الدخل رقم 113 لسنة 1982</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr className="bg-slate-100 font-bold"><td className="border border-slate-400 p-1 text-center font-mono">(2)</td><td className="border border-slate-400 p-1">إجمالي التنزيلات والسماحات</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr className="bg-teal-50 font-bold text-teal-950"><td className="border border-slate-400 p-1 text-center font-mono">(3)</td><td className="border border-slate-400 p-1">الدخل الصافي الخاضع للضريبة [(1) - (2)]</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-900 text-xs">جدول احتساب شرائح الضريبة السنوية:</h4>
            <table className="w-full border-collapse border border-slate-400 text-[10.5px] text-center">
              <thead>
                <tr className="bg-slate-200 font-bold">
                  <th className="border border-slate-400 p-1 w-10">الشريحة</th>
                  <th className="border border-slate-400 p-1 text-right">الدخل الخاضع للضريبة</th>
                  <th className="border border-slate-400 p-1 w-20">النسبة</th>
                  <th className="border border-slate-400 p-1 w-32">قيمة الضريبة (د.ع)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-slate-400 p-1 font-mono font-bold">أ</td><td className="border border-slate-400 p-1 text-right">لغاية 250,000 دينار</td><td className="border border-slate-400 p-1 font-mono">3%</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 font-mono font-bold">ب</td><td className="border border-slate-400 p-1 text-right">ما زاد عن 250,000 لغاية 500,000 دينار</td><td className="border border-slate-400 p-1 font-mono">5%</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 font-mono font-bold">ج</td><td className="border border-slate-400 p-1 text-right">ما زاد عن 500,000 لغاية 1,000,000 دينار</td><td className="border border-slate-400 p-1 font-mono">10%</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr><td className="border border-slate-400 p-1 font-mono font-bold">د</td><td className="border border-slate-400 p-1 text-right">ما زاد عن 1,000,000 دينار</td><td className="border border-slate-400 p-1 font-mono">15%</td><td className="border border-slate-400 p-1 text-left font-mono"></td></tr>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={3} className="border border-slate-400 p-1 text-left pl-4">مجموع ضريبة الدخل المطلوب دفعها عن السنة:</td>
                  <td className="border border-slate-400 p-1 text-left font-mono text-emerald-800"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-4 border-t-2 border-slate-900 mt-auto">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div><span className="font-bold">توقيع المحاسب:</span> ___________________________</div>
                <div><span className="font-bold">التاريخ:</span> ____/____/202...</div>
              </div>
              <div className="space-y-1">
                <div><span className="font-bold">توقيع المدير المفوض:</span> ___________________________</div>
                <div><span className="font-bold">التاريخ:</span> ____/____/202...</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return pages;
};

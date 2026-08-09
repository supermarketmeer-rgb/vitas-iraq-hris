# إعداد قاعدة بيانات MySQL لنظام Vitas Iraq HRMS

## تم إعداد النظام بنجاح للعمل مع قاعدة بيانات MySQL في XAMPP

### المعلومات الحالية:

#### قاعدة البيانات:
- **اسم قاعدة البيانات**: `vitas_hris`
- **الخادم**: `localhost`
- **المنفذ**: `3306`
- **المستخدم**: `root`
- **كلمة المرور**: (فارغة)

#### الجداول المُنشأة:
1. `users` - مستخدمي النظام (للمصادقة)
2. `employees` - بيانات الموظفين
3. `leave_requests` - طلبات الإجازة
4. `job_vacancies` - الوظائف الشاغرة
5. `candidates` - المرشحين للوظائف
6. `asset_records` - سجلات الأصول
7. `risk_records` - سجلات المخاطر
8. `document_records` - سجلات المستندات
9. `system_notifications` - إشعارات النظام
10. `branches` - الفروع والمواقع
11. `departments` - الأقسام
12. `company_profile` - ملف المؤسسة

#### الخادم (Backend):
- **الإطار**: Node.js + Express
- **المنفذ**: `5000`
- **الواجهة**: `http://localhost:5000/api`

#### التطبيق (Frontend):
- **الإطار**: React + Vite
- **المنفذ**: `5173`
- **الواجهة**: `http://localhost:5173`

### طريقة التشغيل:

#### 1. تشغيل التطبيق فقط (مع LocalStorage):
```bash
npm run dev
```

#### 2. تشغيل الخادم (Backend) فقط:
```bash
npm run server
```

#### 3. تشغيل النظام الكامل (Frontend + Backend + MySQL):
```bash
npm run dev:full
```

### ملفات المشروع:

- `server.js` - خادم Express + الاتصال بقاعدة البيانات
- `database/schema.sql` - هيكل قاعدة البيانات والبيانات الأولية
- `database/config.mjs` - إعدادات الاتصال بقاعدة البيانات
- `src/api/client.ts` - عميل API للاتصال بالخادم
- `src/context/AppContext.tsx` - Context المُعدل للعمل مع API

### الميزات:

1. **الاتصال التلقائي**: التطبيق يحاول الاتصال بقاعدة البيانات MySQL عند التشغيل
2. **النسخ الاحتياطي**: في حالة فشل الاتصال بقاعدة البيانات، يتحول تلقائياً إلى LocalStorage
3. **البيانات الأولية**: يحتوي النظام على بيانات أولية للفروع والأقسام والمستخدم الافتراضي
4. **API كامل**: يوفر جميع نقاط النهاية اللازمة لإدارة الموظفين، الإجازات، الوظائف، إلخ

### للانتقال إلى السحابة مستقبلاً:

1. تصدير قاعدة البيانات من XAMPP:
```bash
C:\xampp\mysql\bin\mysqldump.exe -u root vitas_hris > vitas_hris_backup.sql
```

2. تعديل إعدادات الاتصال في `database/config.mjs`:
```javascript
export default {
  host: 'your-cloud-host.com',
  user: 'your-username',
  password: 'your-password',
  database: 'vitas_hris',
  port: 3306
};
```

3. تحديث URL في `src/api/client.ts`:
```typescript
const API_BASE_URL = 'https://your-api-domain.com/api';
```

### الحالة الحالية:
✅ قاعدة البيانات مُنشأة ومُعدة
✅ الخادم يعمل على المنفذ 5000
✅ التطبيق يعمل على المنفذ 5173
✅ الاتصال بقاعدة البيانات يعمل بنجاح
✅ التطبيق جاهز للاستخدام
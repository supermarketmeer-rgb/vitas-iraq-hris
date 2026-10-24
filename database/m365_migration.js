import crypto from 'crypto';

/**
 * Migration for Microsoft 365 & Outlook Email Integration
 * Creates:
 * 1. m365_email_templates (Templates with placeholder variables)
 * 2. m365_email_audit_logs (Central audit trail for all outgoing emails)
 * 3. Default app_settings for Microsoft 365
 */
export async function runM365Migration(queryFn) {
  console.log('[M365 MIGRATION] Starting Microsoft 365 tables migration...');

  try {
    // 1. Create m365_email_templates table
    await queryFn(`
      CREATE TABLE IF NOT EXISTS m365_email_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        template_name VARCHAR(255) NOT NULL,
        template_name_en VARCHAR(255) NULL,
        category VARCHAR(100) DEFAULT 'general',
        subject VARCHAR(255) NOT NULL,
        body LONGTEXT NOT NULL,
        language VARCHAR(10) DEFAULT 'ar',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Create m365_email_audit_logs table
    await queryFn(`
      CREATE TABLE IF NOT EXISTS m365_email_audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        operation_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(100) NULL,
        user_name VARCHAR(255) NULL,
        recipient_employee_id VARCHAR(100) NULL,
        recipient_name VARCHAR(255) NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        document_name VARCHAR(255) NULL,
        status ENUM('Pending', 'Accepted by Microsoft Graph', 'Failed', 'Delivery Confirmed') NOT NULL DEFAULT 'Pending',
        error_code VARCHAR(100) NULL,
        error_message TEXT NULL,
        graph_message_id VARCHAR(255) NULL,
        attachments_count INT DEFAULT 0,
        attachments_meta JSON NULL,
        idempotency_key VARCHAR(100) NULL,
        sent_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_op_id (operation_id),
        INDEX idx_recipient (recipient_employee_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at),
        INDEX idx_idempotency (idempotency_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Seed default templates if empty
    const existingTemplates = await queryFn('SELECT COUNT(*) as cnt FROM m365_email_templates').catch(() => [{ cnt: 0 }]);
    if (!existingTemplates || existingTemplates[0]?.cnt === 0) {
      console.log('[M365 MIGRATION] Seeding default email templates...');
      const defaultTemplates = [
        {
          template_name: 'إرسال عقد عمل رسمي',
          template_name_en: 'Official Employment Contract Delivery',
          category: 'contracts',
          subject: 'عقد توظيف رسمي - شركة فيتاس العراق - {employee_name}',
          body: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>عزيزي/عزيزتي <strong>{employee_name}</strong> المحترم/ة،</p>
  <p>تحية طيبة وبعد،</p>
  <p>نرفق لكم طياً نسخة من <strong>{document_name}</strong> المعتمد رسمياً لدى شركة فيتاس العراق للتمويل الأصغر.</p>
  <p>يرجى الاطلاع على الشروط والبنود المرفقة بدقة وتأكيد الاستلام والتوقيع وفق الإجراءات المعتمدة.</p>
  <table style="border-collapse: collapse; margin: 15px 0; width: 100%; max-width: 500px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
    <tr><td style="padding: 8px 12px; font-weight: bold; width: 150px; border-bottom: 1px solid #e2e8f0;">الرقم الوظيفي:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{employee_id}</td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #e2e8f0;">القسم:</td><td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">{department_name}</td></tr>
    <tr><td style="padding: 8px 12px; font-weight: bold;">تاريخ الإصدار:</td><td style="padding: 8px 12px;">{current_date}</td></tr>
  </table>
  <p>مع خالص التحيات والتقدير،<br/><strong>{sender_name}</strong><br/>قسم الموارد البشرية - شركة فيتاس العراق</p>
</div>`,
          language: 'ar',
          is_active: 1
        },
        {
          template_name: 'إشعار نموذج وإجراء إداري',
          template_name_en: 'HR Form & Administrative Action Notice',
          category: 'forms',
          subject: 'إشعار نموذج إداري: {document_name} - {employee_name}',
          body: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>عزيزي/عزيزتي <strong>{employee_name}</strong> المحترم/ة،</p>
  <p>تحية طيبة وبعد،</p>
  <p>نود إعلامكم بإصدار المستند الإداري: <strong>{document_name}</strong> الخاص بكم في قسم <strong>{department_name}</strong>.</p>
  <p>يرجى مراجعة تفاصيل المستند المرفق بالبريد الإلكتروني للعمل بموجبه.</p>
  <p>تاريخ الإرسال: <strong>{current_date}</strong></p>
  <p>وتفضلوا بقبول فائق التقدير والاحترام،<br/><strong>{sender_name}</strong><br/>إدارة الموارد البشرية</p>
</div>`,
          language: 'ar',
          is_active: 1
        },
        {
          template_name: 'كتاب رسمي ومخاطبة إدارية',
          template_name_en: 'Official Administrative Letter',
          category: 'letters',
          subject: 'كتاب رسمي: {document_name} - {employee_name}',
          body: `<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>إلى: <strong>{employee_name}</strong> (الرقم الوظيفي: {employee_id})<br/>القسم: <strong>{department_name}</strong></p>
  <p>تحية طيبة وبعد،</p>
  <p>نرفق لكم طياً الكتاب الرسمي المعنون: <strong>{document_name}</strong> والصادر بتاريخ <strong>{current_date}</strong>، للعمل بموجبه وفق الأصول والتعليمات المعتمدة في شركة فيتاس العراق.</p>
  <p>وتفضلوا بقبول فائق الاحترام والتقدير،<br/><strong>{sender_name}</strong></p>
</div>`,
          language: 'ar',
          is_active: 1
        },
        {
          template_name: 'General Document Notification (English)',
          template_name_en: 'General Document Notification',
          category: 'general',
          subject: 'VITAS Iraq HR Document Notification: {document_name} - {employee_name}',
          body: `<div dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.8; color: #1e293b;">
  <p>Dear <strong>{employee_name}</strong>,</p>
  <p>Please find attached the official document: <strong>{document_name}</strong> issued by VITAS Iraq Human Resources.</p>
  <p><strong>Employee ID:</strong> {employee_id}<br/><strong>Department:</strong> {department_name}<br/><strong>Date:</strong> {current_date}</p>
  <p>Best regards,<br/><strong>{sender_name}</strong><br/>Human Resources Department - VITAS Iraq</p>
</div>`,
          language: 'en',
          is_active: 1
        }
      ];

      for (const t of defaultTemplates) {
        await queryFn(
          `INSERT INTO m365_email_templates 
            (template_name, template_name_en, category, subject, body, language, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [t.template_name, t.template_name_en, t.category, t.subject, t.body, t.language, t.is_active]
        );
      }
      console.log(`[M365 MIGRATION] Seeded ${defaultTemplates.length} default email templates.`);
    }

    // 4. Ensure default app_settings for Microsoft 365
    const defaultM365Settings = [
      ['m365_enabled', 'false'],
      ['m365_tenant_id', ''],
      ['m365_client_id', ''],
      ['m365_client_secret_enc', ''],
      ['m365_client_secret_expiry', ''],
      ['m365_sender_mailbox', ''],
      ['m365_sender_display_name', 'VITAS Iraq HR'],
      ['m365_graph_base_url', 'https://graph.microsoft.com/v1.0'],
      ['m365_connection_status', 'needs_setup'],
      ['m365_last_connection_test', '']
    ];

    for (const [k, v] of defaultM365Settings) {
      await queryFn(
        'INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE updated_at = NOW()',
        [k, v]
      ).catch(() => {});
    }

    console.log('[M365 MIGRATION] Microsoft 365 tables and settings initialized successfully.');
    return { success: true };
  } catch (err) {
    console.error('[M365 MIGRATION] Migration error:', err);
    return { success: false, error: err.message };
  }
}

import { getM365Service } from './Microsoft365EmailService.js';
import { runM365AcceptanceTests } from './m365AcceptanceTests.js';

/**
 * Register all Microsoft 365 & Outlook Integration Endpoints
 */
export function registerM365Routes(app, query, db) {
  const m365Service = getM365Service(query);

  // Helper to extract authenticated user role from headers or body
  const getUserRole = (req) => {
    return req.headers['x-user-role'] || req.body?.userRole || req.query?.userRole || 'Admin';
  };

  const getUserName = (req) => {
    return req.headers['x-user-name'] || req.body?.userName || 'مسؤول النظام';
  };

  const getUserId = (req) => {
    return req.headers['x-user-id'] || req.body?.userId || 'SYS-ADMIN';
  };

  // 1. Get Settings (Browser Safe - Secrets are masked/omitted)
  app.get('/api/m365/settings', async (req, res) => {
    try {
      const settings = await m365Service.getPublicSettings();
      res.json(settings);
    } catch (err) {
      console.error('[M365 API] Error getting settings:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Save Settings (Protected - Role checked & Secret encrypted)
  app.post('/api/m365/settings', async (req, res) => {
    try {
      const userRole = getUserRole(req);
      const settings = req.body;
      const updated = await m365Service.saveSettings(settings, userRole);
      res.json({
        success: true,
        message: 'تم حفظ إعدادات الربط مع Microsoft 365 بنجاح.',
        settings: updated
      });
    } catch (err) {
      console.error('[M365 API] Error saving settings:', err);
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 3. Test Connection Live with Microsoft Graph
  app.post('/api/m365/test-connection', async (req, res) => {
    try {
      // If temporary test credentials provided in request body, allow testing them first
      if (req.body?.testCredentials) {
        const { tenantId, clientId, clientSecret, senderMailbox } = req.body.testCredentials;
        if (tenantId && clientId && clientSecret) {
          // Test with provided credentials
          const tempService = new (m365Service.constructor)(query);
          // Override getSettings for this test instance
          const originalGet = tempService.getSettings.bind(tempService);
          tempService.getSettings = async () => ({
            ...(await originalGet()),
            tenantId,
            clientId,
            clientSecret,
            senderMailbox: senderMailbox || (await originalGet()).senderMailbox,
            isConfigured: true
          });
          const result = await tempService.testConnection();
          return res.json(result);
        }
      }

      const result = await m365Service.testConnection();
      res.json(result);
    } catch (err) {
      console.error('[M365 API] Error testing connection:', err);
      res.status(500).json({
        success: false,
        status: 'disconnected',
        error: err.message,
        message_ar: `فشل اختبار الاتصال: ${err.message}`
      });
    }
  });

  // 4. Validate Sender Mailbox
  app.post('/api/m365/validate-mailbox', async (req, res) => {
    try {
      const mailbox = req.body?.mailbox;
      const config = await m365Service.getSettings();
      const targetMailbox = mailbox || config.senderMailbox;

      if (!targetMailbox) {
        return res.status(400).json({
          valid: false,
          error: 'No sender mailbox specified',
          error_ar: 'لم يتم تحديد عنوان صندوق البريد للمرسل'
        });
      }

      const validation = await m365Service.validateSenderMailbox(targetMailbox);
      res.json(validation);
    } catch (err) {
      console.error('[M365 API] Error validating mailbox:', err);
      res.status(500).json({ valid: false, error: err.message });
    }
  });

  // 5. Disable Integration
  app.post('/api/m365/disable', async (req, res) => {
    try {
      const userRole = getUserRole(req);
      await m365Service.saveSettings({ enabled: false }, userRole);
      res.json({
        success: true,
        message: 'تم تعطيل التكامل مع Microsoft 365 بنجاح.',
        enabled: false
      });
    } catch (err) {
      console.error('[M365 API] Error disabling integration:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Search Employees in existing HR database
  app.get('/api/m365/employees/search', async (req, res) => {
    try {
      const q = req.query.q || '';
      const limit = req.query.limit || 20;
      const employees = await m365Service.searchEmployees(q, limit);
      res.json(employees);
    } catch (err) {
      console.error('[M365 API] Error searching employees:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get Employee Email and Details by ID
  app.get('/api/m365/employees/:employeeId/email', async (req, res) => {
    try {
      const empId = req.params.employeeId;
      const details = await m365Service.getEmployeeEmail(empId);
      if (!details.found) {
        return res.status(404).json(details);
      }
      res.json(details);
    } catch (err) {
      console.error('[M365 API] Error getting employee email:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Central Send Email Endpoint
  app.post('/api/m365/send-email', async (req, res) => {
    try {
      const {
        to,
        cc,
        bcc,
        subject,
        bodyHtml,
        bodyText,
        attachments,
        documentName,
        employeeId,
        templateId,
        templateVariables,
        idempotencyKey
      } = req.body;

      const userName = getUserName(req);
      const userId = getUserId(req);

      const result = await m365Service.sendEmail({
        to,
        cc,
        bcc,
        subject,
        bodyHtml,
        bodyText,
        attachments,
        documentName,
        employeeId,
        userId,
        userName,
        templateId,
        templateVariables,
        idempotencyKey
      });

      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (err) {
      console.error('[M365 API] Send email error:', err);
      res.status(500).json({
        success: false,
        status: 'Failed',
        error: err.message,
        error_ar: `خطأ أثناء تنفيذ الإرسال: ${err.message}`
      });
    }
  });

  // 9. Create Email Draft in Outlook
  app.post('/api/m365/create-draft', async (req, res) => {
    try {
      const { to, subject, bodyHtml, attachments, documentName, employeeId } = req.body;
      const userName = getUserName(req);
      const userId = getUserId(req);

      const result = await m365Service.createEmailDraft({
        to,
        subject,
        bodyHtml,
        attachments,
        documentName,
        employeeId,
        userId,
        userName
      });
      res.json(result);
    } catch (err) {
      console.error('[M365 API] Create draft error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Email Templates: List
  app.get('/api/m365/templates', async (req, res) => {
    try {
      const templates = await m365Service.getTemplates();
      res.json(templates);
    } catch (err) {
      console.error('[M365 API] Get templates error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Email Templates: Create
  app.post('/api/m365/templates', async (req, res) => {
    try {
      const { template_name, template_name_en, category, subject, body, language, is_active } = req.body;
      if (!template_name || !subject || !body) {
        return res.status(400).json({ error: 'اسم القالب، عنوان الرسالة، ونص الرسالة حقول إلزامية.' });
      }
      const created = await m365Service.createTemplate({
        template_name,
        template_name_en,
        category,
        subject,
        body,
        language,
        is_active
      });
      res.json({ success: true, template: created });
    } catch (err) {
      console.error('[M365 API] Create template error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 12. Email Templates: Update
  app.put('/api/m365/templates/:id', async (req, res) => {
    try {
      const id = req.params.id;
      const { template_name, template_name_en, category, subject, body, language, is_active } = req.body;
      await m365Service.updateTemplate(id, {
        template_name,
        template_name_en,
        category,
        subject,
        body,
        language,
        is_active
      });
      res.json({ success: true, message: 'تم تحديث القالب بنجاح.' });
    } catch (err) {
      console.error('[M365 API] Update template error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Email Templates: Delete
  app.delete('/api/m365/templates/:id', async (req, res) => {
    try {
      const id = req.params.id;
      await m365Service.deleteTemplate(id);
      res.json({ success: true, message: 'تم حذف القالب بنجاح.' });
    } catch (err) {
      console.error('[M365 API] Delete template error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 14. Audit Logs: List with filters & pagination
  app.get('/api/m365/logs', async (req, res) => {
    try {
      const { page, limit, search, status, employeeId, startDate, endDate } = req.query;
      const report = await m365Service.getAuditLogs({
        page: page || 1,
        limit: limit || 20,
        search,
        status,
        employeeId,
        startDate,
        endDate
      });
      res.json(report);
    } catch (err) {
      console.error('[M365 API] Get logs error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 15. Audit Logs: Get single operation details
  app.get('/api/m365/logs/:id', async (req, res) => {
    try {
      const log = await m365Service.getEmailOperationStatus(req.params.id);
      if (!log) {
        return res.status(404).json({ error: 'Audit log record not found' });
      }
      res.json(log);
    } catch (err) {
      console.error('[M365 API] Get log by id error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 16. Run Full Acceptance Test Suite (15 Acceptance Criteria)
  app.post('/api/m365/run-acceptance-tests', async (req, res) => {
    try {
      const results = await runM365AcceptanceTests(query);
      res.json(results);
    } catch (err) {
      console.error('[M365 API] Run acceptance tests error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('[M365 ROUTES] Microsoft 365 & Outlook integration routes registered successfully.');
}

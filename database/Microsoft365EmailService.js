import http from 'http';
import https from 'https';
import crypto from 'crypto';

/**
 * Microsoft 365 & Outlook Email Central Service for VITAS Iraq HRIS
 * 
 * Supports:
 * - OAuth 2.0 Client Credentials Flow (Microsoft Entra ID)
 * - Microsoft Graph API v1.0
 * - In-memory Token Caching & Automatic Renewal
 * - Sender Mailbox Validation & Health Inspection
 * - Direct Integration with existing 'employees' table
 * - Secure AES-256-GCM Secret Encryption (Never leaked to browser)
 * - Template Variable Substitution ({employee_name}, {employee_id}, {employee_email}, {department_name}, {document_name}, {sender_name}, {current_date})
 * - Attachment Validation & Handling (PDF, DOCX, XLSX, etc.)
 * - Central Audit Trail in m365_email_audit_logs
 * - Idempotency & Duplicate Prevention
 */

// Encryption Key derivation for Client Secret
const ENCRYPTION_SALT = 'vitas-iraq-hris-m365-secret-key-salt-2026';
const SYSTEM_MASTER_KEY = crypto.scryptSync(process.env.APP_SECRET || 'vitas-iraq-internal-master-key-secure', ENCRYPTION_SALT, 32);

// In-Memory Token Cache
let cachedAccessToken = null;
let tokenExpiresAt = 0;

// Idempotency in-memory lock cache (expires after 5 minutes)
const idempotencyLocks = new Map();

/**
 * Encrypt plain text using AES-256-GCM
 */
export function encryptSecret(plainText) {
  if (!plainText || typeof plainText !== 'string') return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', SYSTEM_MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decryptSecret(cipherText) {
  if (!cipherText || typeof cipherText !== 'string' || !cipherText.includes(':')) {
    return cipherText || '';
  }
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText;
    const [ivHex, tagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', SYSTEM_MASTER_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[M365 SERVICE] Secret decryption failed:', err.message);
    return '';
  }
}

/**
 * HTTPS Request Helper returning a Promise
 */
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Microsoft Graph API request timed out (20s limit)'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Central Service Class & Singleton
 */
export class Microsoft365EmailService {
  constructor(queryFn) {
    this.query = queryFn;
  }

  /**
   * Read Internal Settings with Decrypted Secret (Backend Only)
   */
  async getSettings() {
    let settings = {
      enabled: false,
      tenantId: process.env.MS_GRAPH_TENANT_ID || '',
      clientId: process.env.MS_GRAPH_CLIENT_ID || '',
      clientSecret: process.env.MS_GRAPH_CLIENT_SECRET || '',
      clientSecretExpiry: '',
      senderMailbox: process.env.MS_GRAPH_SENDER_EMAIL || '',
      senderDisplayName: 'VITAS Iraq HR',
      graphBaseUrl: 'https://graph.microsoft.com/v1.0',
      connectionStatus: 'needs_setup',
      lastConnectionTest: null
    };

    if (this.query) {
      try {
        const rows = await this.query(
          "SELECT setting_key, setting_value FROM app_settings WHERE setting_key LIKE 'm365_%'"
        ).catch(() => []);

        for (const row of rows || []) {
          const val = row.setting_value ? String(row.setting_value).trim() : '';
          switch (row.setting_key) {
            case 'm365_enabled':
              settings.enabled = val === 'true' || val === '1';
              break;
            case 'm365_tenant_id':
              if (val) settings.tenantId = val;
              break;
            case 'm365_client_id':
              if (val) settings.clientId = val;
              break;
            case 'm365_client_secret_enc':
              if (val) settings.clientSecret = decryptSecret(val);
              break;
            case 'm365_client_secret_expiry':
              settings.clientSecretExpiry = val;
              break;
            case 'm365_sender_mailbox':
              if (val) settings.senderMailbox = val;
              break;
            case 'm365_sender_display_name':
              if (val) settings.senderDisplayName = val;
              break;
            case 'm365_graph_base_url':
              if (val) settings.graphBaseUrl = val;
              break;
            case 'm365_connection_status':
              if (val) settings.connectionStatus = val;
              break;
            case 'm365_last_connection_test':
              if (val) {
                try { settings.lastConnectionTest = JSON.parse(val); } catch (e) {}
              }
              break;
          }
        }
      } catch (e) {
        console.error('[M365 SERVICE] Error fetching settings from DB:', e.message);
      }
    }

    settings.isConfigured = Boolean(
      settings.tenantId &&
      settings.clientId &&
      settings.clientSecret &&
      settings.senderMailbox &&
      !settings.tenantId.includes('YOUR_') &&
      !settings.clientId.includes('YOUR_')
    );

    return settings;
  }

  /**
   * Read Public Safe Settings for Browser (Secret is NEVER sent)
   */
  async getPublicSettings() {
    const raw = await this.getSettings();
    return {
      enabled: raw.enabled,
      tenantId: raw.tenantId,
      clientId: raw.clientId,
      hasClientSecret: Boolean(raw.clientSecret && raw.clientSecret.length > 5),
      clientSecretMasked: raw.clientSecret ? '••••••••••••••••' : '',
      clientSecretExpiry: raw.clientSecretExpiry,
      senderMailbox: raw.senderMailbox,
      senderDisplayName: raw.senderDisplayName,
      graphBaseUrl: raw.graphBaseUrl,
      connectionStatus: raw.connectionStatus,
      lastConnectionTest: raw.lastConnectionTest,
      isConfigured: raw.isConfigured
    };
  }

  /**
   * Save Settings to DB (Encrypted Secret & Role Check)
   */
  async saveSettings(newSettings, userRole = 'Super Admin') {
    // Only authorized administrative roles can update settings
    const authorizedRoles = ['Super Admin', 'HR Manager', 'Admin'];
    if (!authorizedRoles.includes(userRole)) {
      throw new Error('غير مصرح لك بتعديل إعدادات الربط مع Microsoft 365. يتطلب صلاحيات مسؤول النظام.');
    }

    const current = await this.getSettings();

    const enabled = typeof newSettings.enabled === 'boolean' ? String(newSettings.enabled) : String(current.enabled);
    const tenantId = newSettings.tenantId !== undefined ? String(newSettings.tenantId).trim() : current.tenantId;
    const clientId = newSettings.clientId !== undefined ? String(newSettings.clientId).trim() : current.clientId;
    const clientSecretExpiry = newSettings.clientSecretExpiry !== undefined ? String(newSettings.clientSecretExpiry).trim() : current.clientSecretExpiry;
    const senderMailbox = newSettings.senderMailbox !== undefined ? String(newSettings.senderMailbox).trim().toLowerCase() : current.senderMailbox;
    const senderDisplayName = newSettings.senderDisplayName !== undefined ? String(newSettings.senderDisplayName).trim() : current.senderDisplayName;
    const graphBaseUrl = newSettings.graphBaseUrl !== undefined ? String(newSettings.graphBaseUrl).trim() : current.graphBaseUrl;

    // Handle Client Secret update: only re-encrypt if a new unmasked string is provided
    let clientSecretToSave = null;
    if (newSettings.clientSecret && typeof newSettings.clientSecret === 'string') {
      const trimmed = newSettings.clientSecret.trim();
      if (trimmed && !trimmed.includes('••••')) {
        clientSecretToSave = encryptSecret(trimmed);
        // Clear cached token so next request tests with the new secret
        cachedAccessToken = null;
        tokenExpiresAt = 0;
      }
    }

    const updates = [
      ['m365_enabled', enabled],
      ['m365_tenant_id', tenantId],
      ['m365_client_id', clientId],
      ['m365_client_secret_expiry', clientSecretExpiry],
      ['m365_sender_mailbox', senderMailbox],
      ['m365_sender_display_name', senderDisplayName],
      ['m365_graph_base_url', graphBaseUrl]
    ];

    if (clientSecretToSave !== null) {
      updates.push(['m365_client_secret_enc', clientSecretToSave]);
    }

    for (const [key, val] of updates) {
      await this.query(
        'INSERT INTO app_settings (setting_key, setting_value, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()',
        [key, val, val]
      );
    }

    return await this.getPublicSettings();
  }

  /**
   * Acquire OAuth 2.0 Access Token using Client Credentials
   * Auto-refreshes when token is expired or within 2 minutes of expiry
   */
  async getAccessToken(forceRefresh = false) {
    if (!forceRefresh && cachedAccessToken && tokenExpiresAt > Date.now() + 120000) {
      return cachedAccessToken;
    }

    const config = await this.getSettings();

    if (!config.tenantId || !config.clientId || !config.clientSecret) {
      throw new Error('بيانات مصادقة Microsoft 365 غير مكتملة (Tenant ID, Client ID, Client Secret مطلوبة).');
    }

    const postParams = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials'
    }).toString();

    const options = {
      hostname: 'login.microsoftonline.com',
      port: 443,
      path: `/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`,
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postParams)
      }
    };

    const response = await httpsRequest(options, postParams);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      let errMsg = `Status ${response.statusCode}`;
      let errCode = 'AUTH_ERROR';
      try {
        const errObj = JSON.parse(response.body);
        errMsg = errObj.error_description || errObj.error || errMsg;
        errCode = errObj.error || errCode;
      } catch (e) {}

      // Check specific error for expired secret
      if (errMsg.includes('AADSTS7000222') || errMsg.toLowerCase().includes('expired')) {
        throw new Error(`انتهت صلاحية المفتاح السري (Client Secret Expired): ${errMsg}`);
      }
      throw new Error(`فشل التحقق من هوية Microsoft Entra ID: ${errMsg}`);
    }

    const tokenData = JSON.parse(response.body);
    cachedAccessToken = tokenData.access_token;
    tokenExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

    return cachedAccessToken;
  }

  /**
   * Test Microsoft 365 Connection Live
   */
  async testConnection() {
    const config = await this.getSettings();
    const testResult = {
      success: false,
      timestamp: new Date().toISOString(),
      status: 'disconnected',
      message: '',
      message_ar: '',
      tokenExpiresIn: 0,
      mailboxValidated: false
    };

    if (!config.isConfigured) {
      testResult.status = 'needs_setup';
      testResult.message = 'Microsoft 365 credentials are not fully configured in settings.';
      testResult.message_ar = 'بيانات الربط مع Microsoft 365 غير مكتملة في الإعدادات.';
      await this.saveConnectionStatus('needs_setup', testResult);
      return testResult;
    }

    try {
      // Step 1: Acquire token from Entra ID
      const token = await this.getAccessToken(true);
      testResult.tokenExpiresIn = Math.max(0, Math.round((tokenExpiresAt - Date.now()) / 1000));

      // Step 2: Validate sender mailbox via Graph API
      if (config.senderMailbox) {
        const mailboxCheck = await this.validateSenderMailbox(config.senderMailbox, token);
        testResult.mailboxValidated = mailboxCheck.valid;
        if (!mailboxCheck.valid) {
          testResult.status = 'mailbox_error';
          testResult.message = `Token acquired, but mailbox check failed: ${mailboxCheck.error}`;
          testResult.message_ar = `تم الحصول على رمز المصادقة، ولكن التحقق من صندوق البريد فشل: ${mailboxCheck.error_ar || mailboxCheck.error}`;
          await this.saveConnectionStatus('needs_setup', testResult);
          return testResult;
        }
      }

      testResult.success = true;
      testResult.status = 'connected';
      testResult.message = 'Successfully authenticated with Microsoft Entra ID and verified Microsoft Graph API access.';
      testResult.message_ar = 'تم التحقق بنجاح من هوية Microsoft Entra ID والتأكد من إمكانية الوصول إلى Microsoft Graph API.';
      await this.saveConnectionStatus('connected', testResult);
      return testResult;

    } catch (err) {
      testResult.status = 'disconnected';
      testResult.error = err.message;
      testResult.message = `Connection test failed: ${err.message}`;
      testResult.message_ar = `فشل اختبار الاتصال: ${err.message}`;
      await this.saveConnectionStatus('disconnected', testResult);
      return testResult;
    }
  }

  /**
   * Helper to persist connection status
   */
  async saveConnectionStatus(status, testResult) {
    if (!this.query) return;
    try {
      await this.query(
        "UPDATE app_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'm365_connection_status'",
        [status]
      );
      await this.query(
        "UPDATE app_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'm365_last_connection_test'",
        [JSON.stringify(testResult)]
      );
    } catch (e) {}
  }

  /**
   * Validate Sender Mailbox in Microsoft 365
   */
  async validateSenderMailbox(mailbox, accessToken = null) {
    if (!mailbox || !mailbox.includes('@')) {
      return {
        valid: false,
        error: 'Invalid email address format',
        error_ar: 'تنسيق عنوان البريد الإلكتروني غير صحيح'
      };
    }

    try {
      const token = accessToken || await this.getAccessToken();
      const options = {
        hostname: 'graph.microsoft.com',
        port: 443,
        path: `/v1.0/users/${encodeURIComponent(mailbox)}?$select=id,displayName,mail,userPrincipalName,accountEnabled`,
        method: 'GET',
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };

      const response = await httpsRequest(options);

      if (response.statusCode === 200) {
        const userObj = JSON.parse(response.body);
        return {
          valid: true,
          mailbox: userObj.mail || userObj.userPrincipalName,
          displayName: userObj.displayName,
          accountEnabled: userObj.accountEnabled !== false,
          message: 'Mailbox verified successfully in Microsoft 365 tenant.',
          message_ar: 'تم التحقق من وجود ونشاط صندوق البريد في Microsoft 365 بنجاح.'
        };
      }

      let errDetail = `Status ${response.statusCode}`;
      try {
        const errJson = JSON.parse(response.body);
        errDetail = errJson.error?.message || errDetail;
      } catch (e) {}

      return {
        valid: false,
        statusCode: response.statusCode,
        error: errDetail,
        error_ar: response.statusCode === 404
          ? `صندوق البريد (${mailbox}) غير موجود في حساب Microsoft 365 للمؤسسة.`
          : `خطأ أثناء فحص صندوق البريد: ${errDetail}`
      };
    } catch (err) {
      return {
        valid: false,
        error: err.message,
        error_ar: `فشل التحقق من صندوق البريد: ${err.message}`
      };
    }
  }

  /**
   * Extract and Validate Employee Email from Existing 'employees' Table
   */
  async getEmployeeEmail(employeeId) {
    if (!employeeId) {
      return {
        found: false,
        valid_email: false,
        error: 'Employee identifier was not provided',
        error_ar: 'لم يتم تزويد معرّف الموظف'
      };
    }

    const rows = await this.query(
      `SELECT id, employee_id, badge_no, full_name_ar, full_name_en, email, personal_email, org_email, department, position_ar, status 
       FROM employees 
       WHERE id = ? OR employee_id = ? OR badge_no = ? 
       LIMIT 1`,
      [employeeId, employeeId, employeeId]
    );

    if (!rows || rows.length === 0) {
      return {
        found: false,
        valid_email: false,
        error: `Employee record (${employeeId}) not found in HR database.`,
        error_ar: `لم يتم العثور على سجل الموظف (${employeeId}) في قاعدة بيانات الموارد البشرية.`
      };
    }

    const emp = rows[0];
    // Candidate email fields prioritized: official corporate email first, then org_email
    const candidateEmail = (emp.email || emp.org_email || '').trim();

    // Validate email format
    const isPlaceholder = candidateEmail.includes('no-email') || candidateEmail.includes('.example') || candidateEmail.includes('.local');
    const isValidFormat = candidateEmail.length > 5 && candidateEmail.includes('@') && candidateEmail.includes('.');

    const hasValidEmail = isValidFormat && !isPlaceholder;

    return {
      found: true,
      id: emp.id,
      employee_id: emp.employee_id,
      badge_no: emp.badge_no,
      full_name_ar: emp.full_name_ar,
      full_name_en: emp.full_name_en,
      department: emp.department || 'غير محدد',
      position_ar: emp.position_ar || 'غير محدد',
      email: candidateEmail,
      valid_email: hasValidEmail,
      error: hasValidEmail ? null : 'Employee does not have a valid corporate Microsoft 365 email registered.',
      error_ar: hasValidEmail ? null : `الموظف (${emp.full_name_ar}) لا يمتلك بريداً إلكترونياً مؤسسياً صالحاً في قاعدة البيانات.`
    };
  }

  /**
   * Search Employees in existing 'employees' table for sending selector
   */
  async searchEmployees(searchQuery = '', limit = 20) {
    const q = String(searchQuery || '').trim();
    let sql = `
      SELECT id, employee_id, badge_no, full_name_ar, full_name_en, email, department, position_ar, status 
      FROM employees 
    `;
    const params = [];

    if (q) {
      sql += ` WHERE full_name_ar LIKE ? OR full_name_en LIKE ? OR employee_id LIKE ? OR email LIKE ? OR badge_no LIKE ? `;
      const pattern = `%${q}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    sql += ` ORDER BY id ASC LIMIT ?`;
    params.push(Math.min(100, Math.max(1, parseInt(limit) || 20)));

    const rows = await this.query(sql, params).catch(() => []);

    return rows.map(emp => {
      const email = (emp.email || '').trim();
      const isPlaceholder = email.includes('no-email') || email.includes('.example') || email.includes('.local');
      const isValid = email.length > 5 && email.includes('@') && email.includes('.') && !isPlaceholder;
      return {
        id: emp.id,
        employee_id: emp.employee_id,
        badge_no: emp.badge_no,
        full_name_ar: emp.full_name_ar,
        full_name_en: emp.full_name_en,
        name: emp.full_name_ar || emp.full_name_en,
        email: email,
        department: emp.department,
        position_ar: emp.position_ar,
        status: emp.status,
        valid_email: isValid
      };
    });
  }

  /**
   * Substitute Variables in Subject & Body safely
   */
  substituteVariables(templateText, variables = {}) {
    if (!templateText || typeof templateText !== 'string') return '';
    let result = templateText;

    const safeVars = {
      employee_name: variables.employee_name || '',
      employee_id: variables.employee_id || '',
      employee_email: variables.employee_email || '',
      department_name: variables.department_name || '',
      document_name: variables.document_name || '',
      sender_name: variables.sender_name || 'VITAS Iraq HR',
      current_date: variables.current_date || new Date().toISOString().split('T')[0]
    };

    for (const [key, val] of Object.entries(safeVars)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, String(val ?? ''));
    }

    return result;
  }

  /**
   * Central Email Sending Function
   */
  async sendEmail({
    to,
    cc = [],
    bcc = [],
    subject,
    bodyHtml,
    bodyText,
    attachments = [],
    documentName = '',
    employeeId = null,
    userId = null,
    userName = 'System User',
    templateId = null,
    templateVariables = {},
    idempotencyKey = null
  }) {
    const operationId = `OP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // 1. Double-Submission & Idempotency Check
    if (idempotencyKey) {
      if (idempotencyLocks.has(idempotencyKey)) {
        return {
          success: false,
          operationId,
          status: 'duplicate_blocked',
          error: 'Duplicate send request detected. Processed already or currently running.',
          error_ar: 'تم كشف طلب إرسال مكرر. العملية قيد المعالجة مسبقاً.'
        };
      }
      idempotencyLocks.set(idempotencyKey, Date.now());
      setTimeout(() => idempotencyLocks.delete(idempotencyKey), 300000); // 5 min TTL
    }

    const config = await this.getSettings();

    // 2. Integration Enabled Check
    if (!config.enabled) {
      return {
        success: false,
        operationId,
        status: 'disabled',
        error: 'Microsoft 365 integration is disabled in system settings.',
        error_ar: 'خدمة التكامل مع Microsoft 365 معطلة حالياً في إعدادات النظام.'
      };
    }

    // 3. Configuration Check
    if (!config.isConfigured) {
      return {
        success: false,
        operationId,
        status: 'config_missing',
        error: 'Microsoft 365 credentials (Tenant ID, Client ID, Client Secret, Sender Mailbox) are incomplete.',
        error_ar: 'بيانات اعتماد خدمة Microsoft 365 غير مهيأة أو غير مكتملة في خادم النظام.'
      };
    }

    // 4. Resolve Recipient(s)
    let recipientList = [];
    let recipientName = '';
    let recipientEmpId = employeeId || '';

    if (employeeId) {
      const empRes = await this.getEmployeeEmail(employeeId);
      if (!empRes.found) {
        return {
          success: false,
          operationId,
          status: 'recipient_not_found',
          error: empRes.error,
          error_ar: empRes.error_ar
        };
      }
      if (!empRes.valid_email) {
        return {
          success: false,
          operationId,
          status: 'invalid_recipient_email',
          error: empRes.error,
          error_ar: empRes.error_ar
        };
      }
      recipientList = [empRes.email];
      recipientName = empRes.full_name_ar || empRes.full_name_en;
      recipientEmpId = empRes.employee_id || String(empRes.id);

      // Auto-populate template variables if not provided
      templateVariables = {
        employee_name: recipientName,
        employee_id: recipientEmpId,
        employee_email: empRes.email,
        department_name: empRes.department,
        document_name: documentName,
        sender_name: userName || config.senderDisplayName,
        current_date: new Date().toISOString().split('T')[0],
        ...templateVariables
      };
    } else {
      recipientList = Array.isArray(to) ? to : [to];
    }

    // Filter valid recipients
    const validTo = recipientList
      .map(e => String(e || '').trim())
      .filter(e => e.length > 5 && e.includes('@') && !e.includes('no-email'));

    if (validTo.length === 0) {
      return {
        success: false,
        operationId,
        status: 'invalid_recipient',
        error: 'No valid recipient email address provided.',
        error_ar: 'لا يوجد عنوان بريد إلكتروني صالح للمستلم.'
      };
    }

    // 5. Template Resolution
    let finalSubject = subject;
    let finalBodyHtml = bodyHtml;

    if (templateId && this.query) {
      try {
        const tRows = await this.query('SELECT * FROM m365_email_templates WHERE id = ? LIMIT 1', [templateId]);
        if (tRows && tRows.length > 0) {
          const tpl = tRows[0];
          finalSubject = this.substituteVariables(tpl.subject, templateVariables);
          finalBodyHtml = this.substituteVariables(tpl.body, templateVariables);
        }
      } catch (e) {
        console.error('[M365 SERVICE] Error resolving template:', e.message);
      }
    } else if (templateVariables && Object.keys(templateVariables).length > 0) {
      finalSubject = this.substituteVariables(finalSubject, templateVariables);
      finalBodyHtml = this.substituteVariables(finalBodyHtml, templateVariables);
    }

    finalSubject = finalSubject || `وثيقة رسمية من فيتاس العراق - ${documentName || 'مستند إداري'}`;
    finalBodyHtml = finalBodyHtml || (bodyText ? `<p>${bodyText}</p>` : `<p>يرجى الاطلاع على المستند المرفق.</p>`);

    // 6. Validate and Format Attachments
    const validatedAttachments = [];
    const attachmentsMeta = [];

    for (const att of attachments || []) {
      if (!att || !att.contentBytes) continue;
      const fileName = att.name || 'document.pdf';
      const contentType = att.contentType || 'application/pdf';
      const sizeBytes = Buffer.byteLength(att.contentBytes, 'base64');

      // Max single attachment size: 25MB via Graph
      if (sizeBytes > 25 * 1024 * 1024) {
        return {
          success: false,
          operationId,
          status: 'attachment_too_large',
          error: `Attachment ${fileName} exceeds maximum allowed size (25MB)`,
          error_ar: `حجم المرفق (${fileName}) يتجاوز الحد الأقصى المسموح به (25 ميجابايت)`
        };
      }

      validatedAttachments.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: fileName,
        contentType: contentType,
        contentBytes: att.contentBytes
      });

      attachmentsMeta.push({
        name: fileName,
        type: contentType,
        sizeBytes: sizeBytes
      });
    }

    // 7. Insert Initial Audit Log (Status: Pending)
    await this.logEmailOperation({
      id: operationId,
      operationId,
      userId,
      userName,
      recipientEmployeeId: recipientEmpId,
      recipientName,
      recipientEmail: validTo.join('; '),
      subject: finalSubject,
      documentName,
      status: 'Pending',
      attachmentsCount: validatedAttachments.length,
      attachmentsMeta,
      idempotencyKey
    });

    // 8. Execute Microsoft Graph sendMail
    try {
      const accessToken = await this.getAccessToken();

      const graphMessage = {
        message: {
          subject: finalSubject,
          body: {
            contentType: 'HTML',
            content: finalBodyHtml
          },
          toRecipients: validTo.map(addr => ({ emailAddress: { address: addr } })),
          ccRecipients: (Array.isArray(cc) ? cc : [cc]).filter(Boolean).map(addr => ({ emailAddress: { address: addr } })),
          bccRecipients: (Array.isArray(bcc) ? bcc : [bcc]).filter(Boolean).map(addr => ({ emailAddress: { address: addr } })),
          attachments: validatedAttachments
        },
        saveToSentItems: true
      };

      const postBody = JSON.stringify(graphMessage);
      const senderPath = `/v1.0/users/${encodeURIComponent(config.senderMailbox)}/sendMail`;

      const options = {
        hostname: 'graph.microsoft.com',
        port: 443,
        path: senderPath,
        method: 'POST',
        timeout: 25000,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postBody)
        }
      };

      const response = await httpsRequest(options, postBody);

      // Graph API returns HTTP 202 Accepted on success
      if (response.statusCode === 202 || response.statusCode === 200) {
        const messageId = response.headers['client-request-id'] || response.headers['request-id'] || `GRAPH-${Date.now()}`;

        // Update Audit Log: Status 'Accepted by Microsoft Graph'
        await this.updateEmailOperationLog(operationId, {
          status: 'Accepted by Microsoft Graph',
          graphMessageId: messageId,
          sentAt: new Date()
        });

        return {
          success: true,
          operationId,
          status: 'Accepted by Microsoft Graph',
          graphMessageId: messageId,
          recipients: validTo,
          documentName,
          sentAt: new Date().toISOString(),
          note: 'Accepted by Microsoft Graph for delivery. Note: This indicates Microsoft cloud accepted the message for processing, not yet confirmed inbox delivery.'
        };
      }

      // Handle Graph Errors (Status >= 400)
      let errorCode = `HTTP_${response.statusCode}`;
      let errorMessage = `Graph API Error (Status ${response.statusCode})`;

      try {
        const errObj = JSON.parse(response.body);
        errorCode = errObj?.error?.code || errorCode;
        errorMessage = errObj?.error?.message || errorMessage;
      } catch (e) {}

      // Update Audit Log: Status 'Failed'
      await this.updateEmailOperationLog(operationId, {
        status: 'Failed',
        errorCode,
        errorMessage
      });

      return {
        success: false,
        operationId,
        status: 'Failed',
        errorCode,
        error: errorMessage,
        error_ar: `فشل الإرسال عبر Microsoft Graph: ${errorMessage}`
      };

    } catch (sendErr) {
      console.error('[M365 SERVICE] Email send exception:', sendErr.message);

      await this.updateEmailOperationLog(operationId, {
        status: 'Failed',
        errorCode: 'SEND_EXCEPTION',
        errorMessage: sendErr.message
      });

      return {
        success: false,
        operationId,
        status: 'Failed',
        errorCode: 'SEND_EXCEPTION',
        error: sendErr.message,
        error_ar: `حدث استثناء أثناء إرسال البريد: ${sendErr.message}`
      };
    }
  }

  /**
   * Send Email with Attachments wrapper
   */
  async sendEmailWithAttachments(params) {
    return await this.sendEmail(params);
  }

  /**
   * Create Draft Email in Outlook without sending
   */
  async createEmailDraft({
    to,
    subject,
    bodyHtml,
    attachments = [],
    documentName = '',
    employeeId = null,
    userId = null,
    userName = 'System User'
  }) {
    const config = await this.getSettings();
    if (!config.enabled || !config.isConfigured) {
      throw new Error('خدمة Microsoft 365 غير مهيأة أو معطلة.');
    }

    const accessToken = await this.getAccessToken();

    const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
    const draftMessage = {
      subject: subject || 'مسودة رسالة جديدة',
      body: {
        contentType: 'HTML',
        content: bodyHtml || '<p>مسودة</p>'
      },
      toRecipients: recipients.map(addr => ({ emailAddress: { address: addr } })),
      attachments: attachments.map(att => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: att.name || 'document.pdf',
        contentType: att.contentType || 'application/pdf',
        contentBytes: att.contentBytes
      }))
    };

    const postBody = JSON.stringify(draftMessage);
    const options = {
      hostname: 'graph.microsoft.com',
      port: 443,
      path: `/v1.0/users/${encodeURIComponent(config.senderMailbox)}/messages`,
      method: 'POST',
      timeout: 15000,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    };

    const response = await httpsRequest(options, postBody);

    if (response.statusCode === 201 || response.statusCode === 200) {
      const created = JSON.parse(response.body);
      return {
        success: true,
        draftId: created.id,
        webLink: created.webLink,
        message: 'Draft created successfully in Outlook sender mailbox.'
      };
    }

    throw new Error(`Failed to create draft in Outlook: HTTP ${response.statusCode} - ${response.body}`);
  }

  /**
   * Retrieve Status of an Operation
   */
  async getEmailOperationStatus(operationId) {
    if (!this.query) return null;
    const rows = await this.query(
      'SELECT * FROM m365_email_audit_logs WHERE operation_id = ? OR id = ? LIMIT 1',
      [operationId, operationId]
    );
    return rows && rows.length > 0 ? rows[0] : null;
  }

  /**
   * Audit Log helper: Insert initial record
   */
  async logEmailOperation({
    id,
    operationId,
    userId,
    userName,
    recipientEmployeeId,
    recipientName,
    recipientEmail,
    subject,
    documentName,
    status,
    attachmentsCount,
    attachmentsMeta,
    idempotencyKey
  }) {
    if (!this.query) return;
    try {
      await this.query(
        `INSERT INTO m365_email_audit_logs 
          (id, operation_id, user_id, user_name, recipient_employee_id, recipient_name, recipient_email, subject, document_name, status, attachments_count, attachments_meta, idempotency_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          operationId,
          userId,
          userName,
          recipientEmployeeId,
          recipientName,
          recipientEmail,
          subject,
          documentName,
          status,
          attachmentsCount,
          JSON.stringify(attachmentsMeta || []),
          idempotencyKey
        ]
      );
    } catch (e) {
      console.error('[M365 SERVICE] Error inserting audit log:', e.message);
    }
  }

  /**
   * Audit Log helper: Update record status
   */
  async updateEmailOperationLog(operationId, { status, graphMessageId, errorCode, errorMessage, sentAt }) {
    if (!this.query) return;
    try {
      const updates = [];
      const params = [];

      if (status) { updates.push('status = ?'); params.push(status); }
      if (graphMessageId) { updates.push('graph_message_id = ?'); params.push(graphMessageId); }
      if (errorCode) { updates.push('error_code = ?'); params.push(errorCode); }
      if (errorMessage) { updates.push('error_message = ?'); params.push(errorMessage); }
      if (sentAt) { updates.push('sent_at = NOW()'); }

      if (updates.length > 0) {
        params.push(operationId);
        await this.query(
          `UPDATE m365_email_audit_logs SET ${updates.join(', ')}, updated_at = NOW() WHERE operation_id = ? OR id = ?`,
          [...params, operationId]
        );
      }
    } catch (e) {
      console.error('[M365 SERVICE] Error updating audit log:', e.message);
    }
  }

  /**
   * Templates Management: List
   */
  async getTemplates() {
    if (!this.query) return [];
    return await this.query('SELECT * FROM m365_email_templates ORDER BY id ASC');
  }

  /**
   * Templates Management: Create
   */
  async createTemplate({ template_name, template_name_en, category, subject, body, language = 'ar', is_active = 1 }) {
    if (!this.query) return null;
    const res = await this.query(
      `INSERT INTO m365_email_templates 
        (template_name, template_name_en, category, subject, body, language, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [template_name, template_name_en || '', category || 'general', subject, body, language, is_active]
    );
    return { id: res.insertId, template_name, subject };
  }

  /**
   * Templates Management: Update
   */
  async updateTemplate(id, { template_name, template_name_en, category, subject, body, language, is_active }) {
    if (!this.query) return false;
    await this.query(
      `UPDATE m365_email_templates 
       SET template_name = ?, template_name_en = ?, category = ?, subject = ?, body = ?, language = ?, is_active = ?, updated_at = NOW()
       WHERE id = ?`,
      [template_name, template_name_en || '', category || 'general', subject, body, language || 'ar', is_active !== false ? 1 : 0, id]
    );
    return true;
  }

  /**
   * Templates Management: Delete
   */
  async deleteTemplate(id) {
    if (!this.query) return false;
    await this.query('DELETE FROM m365_email_templates WHERE id = ?', [id]);
    return true;
  }

  /**
   * Audit Logs: Query with Filters and Pagination
   */
  async getAuditLogs({ page = 1, limit = 20, search = '', status = '', employeeId = '', startDate = '', endDate = '' }) {
    if (!this.query) return { logs: [], total: 0 };

    let whereClauses = ['1=1'];
    const params = [];

    if (search) {
      whereClauses.push('(recipient_name LIKE ? OR recipient_email LIKE ? OR subject LIKE ? OR document_name LIKE ? OR operation_id LIKE ?)');
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern, pattern, pattern);
    }

    if (status && status !== 'all') {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (employeeId) {
      whereClauses.push('recipient_employee_id = ?');
      params.push(employeeId);
    }

    if (startDate) {
      whereClauses.push('created_at >= ?');
      params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
      whereClauses.push('created_at <= ?');
      params.push(`${endDate} 23:59:59`);
    }

    const whereStr = whereClauses.join(' AND ');

    // Total Count
    const countRows = await this.query(`SELECT COUNT(*) as total FROM m365_email_audit_logs WHERE ${whereStr}`, params);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    // Paginated Rows
    const offset = Math.max(0, (parseInt(page) - 1) * parseInt(limit));
    const rows = await this.query(
      `SELECT id, operation_id, user_id, user_name, recipient_employee_id, recipient_name, recipient_email, subject, document_name, status, error_code, error_message, graph_message_id, attachments_count, sent_at, created_at 
       FROM m365_email_audit_logs 
       WHERE ${whereStr} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    return {
      logs: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    };
  }
}

// Module singleton holder
let serviceInstance = null;

export function getM365Service(queryFn) {
  if (!serviceInstance || queryFn) {
    serviceInstance = new Microsoft365EmailService(queryFn);
  }
  return serviceInstance;
}

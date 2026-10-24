import http from 'http';
import https from 'https';

/**
 * Microsoft 365 & Microsoft Graph API Email Delivery Service
 * Uses Microsoft Entra ID (Azure AD) OAuth 2.0 Client Credentials flow
 * Least-privileged permission recommended: Mail.Send (Application permission restricted via ApplicationAccessPolicy)
 */

import { getM365Service } from './Microsoft365EmailService.js';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Retrieve Microsoft 365 Configuration from environment or database settings
 * @param {Function} [queryFn] - Optional DB query function to check app_settings
 */
export async function getGraphConfig(queryFn = null) {
  const m365 = getM365Service(queryFn);
  const settings = await m365.getSettings();

  return {
    tenantId: settings.tenantId,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    senderEmail: settings.senderMailbox,
    isConfigured: settings.isConfigured,
    enabled: settings.enabled,
    authType: 'client_credentials',
    requiredPermissions: ['Mail.Send']
  };
}

/**
 * Test or inspect Microsoft Graph configuration status
 */
export async function testGraphConnection(queryFn = null) {
  const config = await getGraphConfig(queryFn);

  if (!config.isConfigured) {
    return {
      success: false,
      isConfigured: false,
      status: 'config_missing',
      message: 'Microsoft Graph configuration is incomplete or missing in server environment.',
      message_ar: 'إعدادات Microsoft Graph API غير مكتملة أو مفقودة في خادم النظام.',
      details: {
        hasTenantId: Boolean(config.tenantId),
        hasClientId: Boolean(config.clientId),
        hasClientSecret: Boolean(config.clientSecret),
        hasSenderEmail: Boolean(config.senderEmail),
        requiredEnvVars: [
          'MS_GRAPH_TENANT_ID',
          'MS_GRAPH_CLIENT_ID',
          'MS_GRAPH_CLIENT_SECRET',
          'MS_GRAPH_SENDER_EMAIL'
        ]
      }
    };
  }

  try {
    const token = await getAccessToken(config);
    return {
      success: true,
      isConfigured: true,
      status: 'connected',
      message: 'Successfully authenticated with Microsoft Entra ID and acquired Graph API token.',
      message_ar: 'تم التحقق بنجاح من هوية Microsoft Entra ID والحصول على رمز صلاحية Graph API.',
      senderEmail: config.senderEmail,
      tokenExpiresIn: Math.max(0, Math.round((tokenExpiresAt - Date.now()) / 1000))
    };
  } catch (error) {
    return {
      success: false,
      isConfigured: true,
      status: 'auth_failed',
      message: `Microsoft Graph authentication failed: ${error.message}`,
      message_ar: `فشل التحقق من هوية Microsoft Graph: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Helper to make HTTPS requests with Promise
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
      reject(new Error('Microsoft Graph API request timed out'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

/**
 * Acquire OAuth2 token using Client Credentials
 */
async function getAccessToken(config) {
  // Use cached token if valid for at least 2 more minutes
  if (cachedAccessToken && tokenExpiresAt > Date.now() + 120000) {
    return cachedAccessToken;
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
    timeout: 10000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postParams)
    }
  };

  const response = await httpsRequest(options, postParams);

  if (response.statusCode < 200 || response.statusCode >= 300) {
    let errMsg = `Status ${response.statusCode}`;
    try {
      const errObj = JSON.parse(response.body);
      errMsg = errObj.error_description || errObj.error || errMsg;
    } catch (e) {}
    throw new Error(`Entra ID Token Error: ${errMsg}`);
  }

  const tokenData = JSON.parse(response.body);
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000;

  return cachedAccessToken;
}

/**
 * Send an email through Microsoft Graph API
 * @param {Object} params
 * @param {string|string[]} params.to - Recipient email address(es)
 * @param {string} params.subject - Email subject
 * @param {string} params.bodyHtml - HTML body
 * @param {Array<{ name: string, contentType: string, contentBytes: string }>} [params.attachments] - Base64 attachments
 * @param {Function} [params.queryFn] - Optional DB query function to look up settings
 */
export async function sendEmailViaGraph({
  to,
  subject,
  bodyHtml,
  attachments = [],
  queryFn = null
}) {
  const config = await getGraphConfig(queryFn);

  // If Microsoft Graph is NOT configured in the environment, reject with clear unsimulated error
  if (!config.isConfigured) {
    return {
      success: false,
      status: 'config_missing',
      error: 'Microsoft 365 Graph integration credentials (MS_GRAPH_CLIENT_ID / MS_GRAPH_TENANT_ID) are not configured.',
      error_ar: 'بيانات اعتماد خدمة Microsoft 365 Graph غير مهيأة في خادم النظام.',
      isConfigMissing: true,
      providerMessageId: null
    };
  }

  // Validate recipient email
  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients
    .map(e => String(e || '').trim())
    .filter(e => e.length > 3 && e.includes('@') && !e.includes('no-email'));

  if (validRecipients.length === 0) {
    return {
      success: false,
      status: 'failed',
      error: 'Recipient email address is invalid or missing in employee record.',
      error_ar: 'عنوان البريد الإلكتروني للمستلم غير صالح أو مفقود في سجل الموظف.',
      isInvalidRecipient: true,
      providerMessageId: null
    };
  }

  try {
    const accessToken = await getAccessToken(config);

    // Format Graph API sendMail payload
    const graphMessage = {
      message: {
        subject: subject || 'VITAS Iraq HR Document Notification',
        body: {
          contentType: 'HTML',
          content: bodyHtml || '<p>يرجى الاطلاع على المستند المرفق من نظام الموارد البشرية.</p>'
        },
        toRecipients: validRecipients.map(addr => ({
          emailAddress: { address: addr }
        })),
        attachments: attachments.map(att => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.name || 'document.pdf',
          contentType: att.contentType || 'application/pdf',
          contentBytes: att.contentBytes // base64 string
        }))
      },
      saveToSentItems: true
    };

    const postBody = JSON.stringify(graphMessage);
    const senderPath = `/v1.0/users/${encodeURIComponent(config.senderEmail)}/sendMail`;

    const options = {
      hostname: 'graph.microsoft.com',
      port: 443,
      path: senderPath,
      method: 'POST',
      timeout: 20000,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postBody)
      }
    };

    const response = await httpsRequest(options, postBody);

    // Graph API returns 202 Accepted on success
    if (response.statusCode === 202 || response.statusCode === 200) {
      const messageId = response.headers['client-request-id'] || response.headers['request-id'] || `GRAPH-${Date.now()}`;
      return {
        success: true,
        status: 'accepted',
        providerMessageId: messageId,
        sentAt: new Date().toISOString(),
        recipients: validRecipients
      };
    }

    // Handle Graph errors (rate limits, permissions, mailbox not found)
    let errorMessage = `Graph API Error (Status ${response.statusCode})`;
    let isTransient = response.statusCode === 429 || response.statusCode >= 500;
    try {
      const errObj = JSON.parse(response.body);
      errorMessage = errObj?.error?.message || errObj?.error?.code || errorMessage;
    } catch (e) {}

    return {
      success: false,
      status: isTransient ? 'transient_failure' : 'failed',
      error: errorMessage,
      statusCode: response.statusCode,
      isTransient,
      providerMessageId: null
    };

  } catch (err) {
    return {
      success: false,
      status: 'failed',
      error: err.message,
      isTransient: err.message.includes('timed out') || err.message.includes('ECONNRESET'),
      providerMessageId: null
    };
  }
}

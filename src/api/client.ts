const getApiBaseUrl = (): string => {
  return '/api';
};

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export const apiClient = {
  async handleFetch(url: string, options?: RequestInit, timeoutMs: number = 15000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // Configurable timeout, default 15s

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error('Request timeout - API server is slow or offline');
      }
      if (error?.name === 'TypeError' && (error?.message === 'Failed to fetch' || error?.message?.includes('fetch'))) {
        throw new Error('Backend server is offline or unreachable. Please ensure node server.js is running on port 5000.');
      }
      throw error;
    }
  },

  async get<T>(endpoint: string, timeoutMs: number = 15000): Promise<T> {
    return this.handleFetch(`${getApiBaseUrl()}${endpoint}`, undefined, timeoutMs);
  },

  async post<T>(endpoint: string, data: any, timeoutMs: number = 15000): Promise<T> {
    return this.handleFetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeoutMs);
  },

  async put<T>(endpoint: string, data: any, timeoutMs: number = 15000): Promise<T> {
    return this.handleFetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }, timeoutMs);
  },

  async delete<T>(endpoint: string, timeoutMs: number = 15000): Promise<T> {
    return this.handleFetch(`${getApiBaseUrl()}${endpoint}`, {
      method: 'DELETE',
    }, timeoutMs);
  },
};

// API Endpoints
export const api = {
  // Health check
  health: () => apiClient.get('/health'),

  // Employees
  getEmployees: () => apiClient.get('/employees'),
  addEmployee: (employee: any) => apiClient.post('/employees', employee),
  updateEmployee: (employee: any) => apiClient.post('/employees', employee),
  deleteEmployee: (id: string) => apiClient.delete(`/employees/${id}`),
  uploadEmployeePhoto: async (id: string, photoFile: File) => {
    const formData = new FormData();
    formData.append('photo', photoFile);
    const response = await fetch(`${getApiBaseUrl()}/employees/${id}/photo`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  },
  getEmployeePhoto: (id: string) => `${getApiBaseUrl()}/employees/${id}/photo`,

  // Leave Requests
  getLeaveRequests: () => apiClient.get('/leave-requests'),
  addLeaveRequest: (request: any) => apiClient.post('/leave-requests', request),
  updateLeaveStatus: (id: string, status: string) => 
    apiClient.put(`/leave-requests/${id}/status`, { status }),

  // Job Vacancies
  getJobVacancies: () => apiClient.get('/job-vacancies'),
  addJobVacancy: (job: any) => apiClient.post('/job-vacancies', job),
  updateJobVacancy: (id: string, job: any) => apiClient.put(`/job-vacancies/${id}`, job),
  deleteJobVacancy: (id: string) => apiClient.delete(`/job-vacancies/${id}`),

  // Candidates
  getCandidates: () => apiClient.get('/candidates'),
  addCandidate: async (candidate: any) => {
    if (candidate.resumeFile instanceof File || candidate.photoFile instanceof File) {
      const formData = new FormData();
      Object.keys(candidate).forEach(key => {
        if (candidate[key] !== undefined && candidate[key] !== null) {
          if (key === 'resumeFile' && candidate.resumeFile instanceof File) {
            formData.append('resume', candidate.resumeFile);
          } else if (key === 'photoFile' && candidate.photoFile instanceof File) {
            formData.append('candidate_photo', candidate.photoFile);
          } else {
            formData.append(key, String(candidate[key]));
          }
        }
      });
      const response = await fetch('http://localhost:5000/api/candidates', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    }
    return apiClient.post('/candidates', candidate);
  },
  updateCandidateStage: (id: string, stage: string) => 
    apiClient.put(`/candidates/${id}/stage`, { stage }),
  updateCandidate: (id: string, updates: any) => 
    apiClient.put(`/candidates/${id}`, updates),
  deleteCandidate: (id: string) => apiClient.delete(`/candidates/${id}`),

  // Assets
  getAssets: () => apiClient.get('/assets'),
  addAsset: (asset: any) => apiClient.post('/assets', asset),

  // Risks
  getRisks: () => apiClient.get('/risks'),
  addRisk: (risk: any) => apiClient.post('/risks', risk),

  // Documents
  getDocuments: () => apiClient.get('/documents'),
  addDocument: (document: any) => apiClient.post('/documents', document),

  // Notifications
  getNotifications: () => apiClient.get('/notifications'),
  addNotification: (notification: any) => apiClient.post('/notifications', notification),
  markNotificationRead: (id: string) => apiClient.put(`/notifications/${id}/read`, {}),

  // Branches
  getBranches: () => apiClient.get('/branches'),

  // Departments
  getDepartments: () => apiClient.get('/departments'),

  // Company Profile
  getCompanyProfile: () => apiClient.get('/company-profile'),
  updateCompanyProfile: (id: string, data: any) => apiClient.put(`/company-profile/${id}`, data),
  createCompanyProfile: (data: any) => apiClient.post('/company-profile', data),

  // Settings - Branches
  addBranch: (branch: any) => apiClient.post('/settings/branches', branch),
  updateBranch: (id: string, branch: any) => apiClient.put(`/settings/branches/${id}`, branch),
  deleteBranch: (id: string) => apiClient.delete(`/settings/branches/${id}`),

  // Settings - Positions
  getPositions: () => apiClient.get('/settings/positions'),
  addPosition: (position: any) => apiClient.post('/settings/positions', position),
  updatePosition: (id: string, position: any) => apiClient.put(`/settings/positions/${id}`, position),
  deletePosition: (id: string) => apiClient.delete(`/settings/positions/${id}`),

  // Settings - Departments
  getSettingsDepartments: () => apiClient.get('/settings/departments'),
  addDepartment: (department: any) => apiClient.post('/settings/departments', department),
  updateDepartment: (id: string, department: any) => apiClient.put(`/settings/departments/${id}`, department),
  deleteDepartment: (id: string) => apiClient.delete(`/settings/departments/${id}`),

  // Settings - Contract Types
  getContractTypes: () => apiClient.get('/settings/contract-types'),
  addContractType: (contractType: any) => apiClient.post('/settings/contract-types', contractType),
  updateContractType: (id: string, contractType: any) => apiClient.put(`/settings/contract-types/${id}`, contractType),
  deleteContractType: (id: string) => apiClient.delete(`/settings/contract-types/${id}`),

  // Settings - Status Changes
  getStatusChanges: () => apiClient.get('/settings/status-changes'),
  addStatusChange: (statusChange: any) => apiClient.post('/settings/status-changes', statusChange),
  updateStatusChange: (id: string, statusChange: any) => apiClient.put(`/settings/status-changes/${id}`, statusChange),
  deleteStatusChange: (id: string) => apiClient.delete(`/settings/status-changes/${id}`),

  // Settings - Trainings
  getTrainings: () => apiClient.get('/settings/trainings'),
  addTraining: (training: any) => apiClient.post('/settings/trainings', training),
  updateTraining: (id: string, training: any) => apiClient.put(`/settings/trainings/${id}`, training),
  deleteTraining: (id: string) => apiClient.delete(`/settings/trainings/${id}`),

  // App Settings
  getAppSettings: () => apiClient.get('/settings/app'),
  updateAppSetting: (key: string, value: string) => apiClient.put(`/settings/app/${key}`, { setting_value: value }),
  updateAppSettingsBulk: (settings: Record<string, string>) => apiClient.post('/settings/app/bulk', settings),

  // Contract Template Clauses
  getContractClauses: (contractTypeId: string) => apiClient.get(`/settings/contract-clauses/${contractTypeId}`),
  addContractClause: (clause: any) => apiClient.post('/settings/contract-clauses', clause),
  updateContractClause: (id: string, clause: any) => apiClient.put(`/settings/contract-clauses/${id}`, clause),
  deleteContractClause: (id: string) => apiClient.delete(`/settings/contract-clauses/${id}`),
  deleteContractClauses: (contractTypeId: string) => apiClient.delete(`/settings/contract-clauses/contract/${contractTypeId}`),

  // Employee Status Changes
  getEmployeeStatusChanges: (employeeId: string) => apiClient.get(`/employees/${employeeId}/status-changes`),
  addEmployeeStatusChange: (employeeId: string, change: any) => apiClient.post(`/employees/${employeeId}/status-changes`, change),
  updateEmployeeStatusChange: (employeeId: string, changeId: string, change: any) => apiClient.put(`/employees/${employeeId}/status-changes/${changeId}`, change),
  deleteEmployeeStatusChange: (employeeId: string, changeId: string) => apiClient.delete(`/employees/${employeeId}/status-changes/${changeId}`),

  // Employee Trainings
  getEmployeeTrainings: (employeeId: string) => apiClient.get(`/employees/${employeeId}/trainings`),
  addEmployeeTraining: (employeeId: string, training: any) => apiClient.post(`/employees/${employeeId}/trainings`, training),
  updateEmployeeTraining: (employeeId: string, trainingId: string, training: any) => apiClient.put(`/employees/${employeeId}/trainings/${trainingId}`, training),
  deleteEmployeeTraining: (employeeId: string, trainingId: string) => apiClient.delete(`/employees/${employeeId}/trainings/${trainingId}`),

  // Company Calendar Events
  getCalendarEvents: (params?: { start_date?: string; end_date?: string; event_type?: string; status?: string }) => {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get(`/calendar/events${queryString ? `?${queryString}` : ''}`);
  },
  getCalendarEvent: (id: string) => apiClient.get(`/calendar/events/${id}`),
  addCalendarEvent: (event: any) => apiClient.post('/calendar/events', event),
  updateCalendarEvent: (id: string, event: any) => apiClient.put(`/calendar/events/${id}`, event),
  deleteCalendarEvent: (id: string) => apiClient.delete(`/calendar/events/${id}`),

  // Company Holidays
  getCalendarHolidays: (params?: { year?: string; holiday_type?: string; is_emergency?: boolean }) => {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get(`/calendar/holidays${queryString ? `?${queryString}` : ''}`);
  },
  getCalendarHoliday: (id: string) => apiClient.get(`/calendar/holidays/${id}`),
  addCalendarHoliday: (holiday: any) => apiClient.post('/calendar/holidays', holiday),
  updateCalendarHoliday: (id: string, holiday: any) => apiClient.put(`/calendar/holidays/${id}`, holiday),
  deleteCalendarHoliday: (id: string) => apiClient.delete(`/calendar/holidays/${id}`),

  // Holiday Branches
  getHolidayBranches: (holidayId: string) => apiClient.get(`/calendar/holidays/${holidayId}/branches`),
  addHolidayBranches: (holidayId: string, branchIds: string[]) => apiClient.post(`/calendar/holidays/${holidayId}/branches`, { branch_ids: branchIds }),
  removeHolidayBranches: (holidayId: string, branchIds: string[]) => apiClient.post(`/calendar/holidays/${holidayId}/branches/remove`, { branch_ids: branchIds }),

  // Event Attendees
  getEventAttendees: (eventId: string) => apiClient.get(`/calendar/events/${eventId}/attendees`),
  addEventAttendee: (eventId: string, attendee: any) => apiClient.post(`/calendar/events/${eventId}/attendees`, attendee),
  updateEventAttendee: (eventId: string, attendeeId: string, attendee: any) => 
    apiClient.put(`/calendar/events/${eventId}/attendees/${attendeeId}`, attendee),
  deleteEventAttendee: (eventId: string, attendeeId: string) => 
    apiClient.delete(`/calendar/events/${eventId}/attendees/${attendeeId}`),

  // Company News
  getNews: (params?: { status?: string; category?: string; target_audience?: string }) => {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get(`/news${queryString ? `?${queryString}` : ''}`);
  },
  getNewsItem: (id: string) => apiClient.get(`/news/${id}`),
  addNews: (news: any) => apiClient.post('/news', news),
  updateNews: (id: string, news: any) => apiClient.put(`/news/${id}`, news),
  updateNewsStatus: (id: string, status: string) => apiClient.put(`/news/${id}/status`, { status }),
  deleteNews: (id: string) => apiClient.delete(`/news/${id}`),

  // Reset / Clear Data
  resetData: () => apiClient.post('/reset-data', {}, 60000),

  // Attendance System
  getAttendance: (params?: { employee_id?: string; start_date?: string; end_date?: string; status?: string }) => {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get(`/attendance${queryString ? `?${queryString}` : ''}`);
  },
  getAttendanceRecord: (id: string) => apiClient.get(`/attendance/${id}`),
  getAttendanceDetails: (id: string) => apiClient.get(`/attendance/${id}/details`),
  addAttendance: (attendance: any) => apiClient.post('/attendance', attendance),
  updateAttendance: (id: string, attendance: any) => apiClient.put(`/attendance/${id}`, attendance),
  deleteAttendance: (id: string) => apiClient.delete(`/attendance/${id}`),
  addAttendanceDetail: (id: string, detail: any) => apiClient.post(`/attendance/${id}/details`, detail),

  // Shift Types
  getShiftTypes: () => apiClient.get('/shift-types'),
  addShiftType: (shiftType: any) => apiClient.post('/shift-types', shiftType),
  updateShiftType: (id: string, shiftType: any) => apiClient.put(`/shift-types/${id}`, shiftType),
  deleteShiftType: (id: string) => apiClient.delete(`/shift-types/${id}`),

  // Holidays
  getHolidays: (params?: { year?: string }) => {
    const queryString = params ? new URLSearchParams(params as any).toString() : '';
    return apiClient.get(`/holidays${queryString ? `?${queryString}` : ''}`);
  },
  addHoliday: (holiday: any) => apiClient.post('/holidays', holiday),
  updateHoliday: (id: string, holiday: any) => apiClient.put(`/holidays/${id}`, holiday),
  deleteHoliday: (id: string) => apiClient.delete(`/holidays/${id}`),

  // Attendance Settings
  getAttendanceSettings: () => apiClient.get('/attendance-settings'),
  updateAttendanceSettings: (settings: Record<string, string>) => apiClient.post('/attendance-settings/bulk', settings),
};


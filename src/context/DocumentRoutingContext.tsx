import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DocumentRoutingOptions {
  documentType: string; // 'employment_contract' | 'leave_request' | 'hr_form' | 'official_letter' | 'employee_document' | 'monthly_report' | 'administrative_circular'
  documentId: string;
  documentTitle: string;
  sourceModule?: string;
  employeeId?: string; // target or subject employee id
  employeeName?: string;
  specificEmployeeIds?: string[];
  departmentId?: string;
  branchId?: string;
  suggestedRecipient?: 'direct_supervisor' | 'office_manager' | 'department_manager' | 'top_management' | 'specific_employee' | 'job_position' | 'department_all';
  fileData?: string; // base64 or file URL
  fileName?: string;
  fileType?: string;
  metadata?: Record<string, any>;
  onSuccess?: (deliveryResult: any) => void;
}

interface DocumentRoutingContextType {
  isRoutingOpen: boolean;
  routingOptions: DocumentRoutingOptions | null;
  openDocumentRouting: (options: DocumentRoutingOptions) => void;
  closeDocumentRouting: () => void;
}

const DocumentRoutingContext = createContext<DocumentRoutingContextType | undefined>(undefined);

export const DocumentRoutingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRoutingOpen, setIsRoutingOpen] = useState(false);
  const [routingOptions, setRoutingOptions] = useState<DocumentRoutingOptions | null>(null);

  const openDocumentRouting = (options: DocumentRoutingOptions) => {
    setRoutingOptions(options);
    setIsRoutingOpen(true);
  };

  const closeDocumentRouting = () => {
    setIsRoutingOpen(false);
    setRoutingOptions(null);
  };

  return (
    <DocumentRoutingContext.Provider
      value={{
        isRoutingOpen,
        routingOptions,
        openDocumentRouting,
        closeDocumentRouting
      }}
    >
      {children}
    </DocumentRoutingContext.Provider>
  );
};

export const useDocumentRouting = () => {
  const context = useContext(DocumentRoutingContext);
  if (!context) {
    throw new Error('useDocumentRouting must be used within a DocumentRoutingProvider');
  }
  return context;
};

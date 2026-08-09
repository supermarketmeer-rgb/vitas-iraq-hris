import React from 'react';
import { EmployeePortal } from '../components/EmployeePortal';

export const EmployeePortalView: React.FC = () => {
  return (
    <div className="animate-in fade-in duration-300">
      <EmployeePortal />
    </div>
  );
};
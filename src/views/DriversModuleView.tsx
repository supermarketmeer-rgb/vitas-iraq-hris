import React from 'react';
import DriversApp from '../drivers_management/App';

interface DriversModuleViewProps {
  initialPage?: string;
}

export const DriversModuleView: React.FC<DriversModuleViewProps> = () => {
  return (
    <div className="w-full h-full animate-in fade-in duration-300">
      <DriversApp />
    </div>
  );
};

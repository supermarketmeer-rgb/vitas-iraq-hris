import React, { createContext, useContext } from 'react';

interface DtmsHeaderContextType {
  headerActions: React.ReactNode;
}

const DtmsHeaderContext = createContext<DtmsHeaderContextType>({
  headerActions: null,
});

export const useDtmsHeader = () => useContext(DtmsHeaderContext);

export const DtmsHeaderProvider: React.FC<{
  headerActions: React.ReactNode;
  children: React.ReactNode;
}> = ({ headerActions, children }) => (
  <DtmsHeaderContext.Provider value={{ headerActions }}>
    {children}
  </DtmsHeaderContext.Provider>
);

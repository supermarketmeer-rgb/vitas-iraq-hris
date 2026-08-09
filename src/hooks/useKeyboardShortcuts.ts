import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const useKeyboardShortcuts = () => {
  const {
    setIsSearchOpen,
    isSearchOpen,
    setActiveModuleId,
    setIsSidebarOpen,
    isSidebarOpen
  } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl or Cmd key modifier
      const isModifier = e.ctrlKey || e.metaKey;

      if (isModifier) {
        // Ctrl+K or Cmd+K: Open Search
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setIsSearchOpen(!isSearchOpen);
        }

        // Ctrl+D or Cmd+D: Jump to Dashboard
        if (e.key.toLowerCase() === 'd') {
          e.preventDefault();
          setActiveModuleId('dash-overview');
        }

        // Ctrl+B or Cmd+B: Toggle Sidebar
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          setIsSidebarOpen(!isSidebarOpen);
        }
      }

      // Escape: Close search if open
      if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, isSidebarOpen, setIsSearchOpen, setActiveModuleId, setIsSidebarOpen]);
};

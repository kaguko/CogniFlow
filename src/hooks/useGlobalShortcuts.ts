import { useHotkeys } from 'react-hotkeys-hook';

interface UseGlobalShortcutsParams {
  onSelectTab: (tab: string) => void;
  onOpenChallengeMe: () => void;
  onToggleFocusMode: () => void;
  onToggleHelpModal: () => void;
  onEscape: () => void;
}

export function useGlobalShortcuts({
  onSelectTab,
  onOpenChallengeMe,
  onToggleFocusMode,
  onToggleHelpModal,
  onEscape,
}: UseGlobalShortcutsParams) {
  const options = { enableOnFormTags: false };

  // Tab Switching (1-8 or Alt+1..8)
  useHotkeys('1, alt+1', (e) => { e.preventDefault(); onSelectTab('microsteps'); }, options);
  useHotkeys('2, alt+2', (e) => { e.preventDefault(); onSelectTab('goals'); }, options);
  useHotkeys('3, alt+3', (e) => { e.preventDefault(); onSelectTab('horizon'); }, options);
  useHotkeys('4, alt+4', (e) => { e.preventDefault(); onSelectTab('bottlenecks'); }, options);
  useHotkeys('5, alt+5', (e) => { e.preventDefault(); onSelectTab('whyfirst'); }, options);
  useHotkeys('6, alt+6', (e) => { e.preventDefault(); onSelectTab('behavioral'); }, options);
  useHotkeys('7, alt+7', (e) => { e.preventDefault(); onSelectTab('rag'); }, options);
  useHotkeys('8, alt+8', (e) => { e.preventDefault(); onSelectTab('jsonb_index'); }, options);

  // Trigger 'Challenge Me' Socratic Advisor (Shift+C or Alt+C)
  useHotkeys('shift+c, alt+c', (e) => {
    e.preventDefault();
    onOpenChallengeMe();
  }, options);

  // Toggle Focus Mode (Shift+F or Alt+F)
  useHotkeys('shift+f, alt+f', (e) => {
    e.preventDefault();
    onToggleFocusMode();
  }, options);

  // Toggle Help Cheat Sheet Modal (Shift+? or Alt+H)
  useHotkeys('shift+?, alt+h', (e) => {
    e.preventDefault();
    onToggleHelpModal();
  }, options);

  // Close modals or exit focus mode on Escape
  useHotkeys('escape', () => {
    onEscape();
  }, { enableOnFormTags: true });
}

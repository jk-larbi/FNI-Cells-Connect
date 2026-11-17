import { AppNavTab } from '../types';

export interface NavigationHistoryEntry {
  tab: AppNavTab;
  meta?: any;
  timestamp: number;
}

export type BackInterceptor = () => boolean;

export class NavigationService {
  private static historyStack: NavigationHistoryEntry[] = [];
  private static interceptors: BackInterceptor[] = [];
  private static isNavigatingBack = false;

  /**
   * Register a modal, drawer, or sub-view back interceptor.
   * If the interceptor returns `true`, the back action was consumed (e.g. modal closed)
   * and the page should NOT transition to a previous tab.
   */
  static registerInterceptor(fn: BackInterceptor): () => void {
    this.interceptors.push(fn);
    return () => {
      this.interceptors = this.interceptors.filter(i => i !== fn);
    };
  }

  /**
   * Triggers the top-most back interceptor if one is registered.
   * Returns `true` if handled, `false` otherwise.
   */
  static triggerInterceptor(): boolean {
    if (this.interceptors.length > 0) {
      // Pop and evaluate the latest registered interceptor
      const top = this.interceptors[this.interceptors.length - 1];
      const handled = top();
      if (handled) {
        return true;
      }
    }
    return false;
  }

  /**
   * Record navigation to a new tab
   */
  static pushTab(tab: AppNavTab, meta?: any): void {
    const current = this.historyStack[this.historyStack.length - 1];
    if (current && current.tab === tab && JSON.stringify(current.meta) === JSON.stringify(meta)) {
      return; // Do not push duplicates
    }
    this.historyStack.push({
      tab,
      meta,
      timestamp: Date.now(),
    });

    // Synchronize browser history for hardware Back, Android gesture, and iPhone swipe
    try {
      const stateObj = { fniNav: true, tab, meta, index: this.historyStack.length };
      const hash = `#${tab}`;
      if (window.location.hash !== hash) {
        window.history.pushState(stateObj, '', hash);
      } else {
        window.history.replaceState(stateObj, '', hash);
      }
    } catch {
      // Ignore in non-browser environments
    }
  }

  /**
   * Pop the previous tab from history stack
   */
  static popTab(): NavigationHistoryEntry | null {
    if (this.historyStack.length <= 1) {
      this.historyStack = [];
      return null;
    }
    this.historyStack.pop(); // Remove current
    const prev = this.historyStack[this.historyStack.length - 1];
    return prev || null;
  }

  /**
   * Get the current history stack length
   */
  static getHistoryLength(): number {
    return this.historyStack.length;
  }

  /**
   * Sensible parent fallback when history is empty or direct URL visited
   */
  static getParentTab(currentTab: AppNavTab, isAdmin: boolean): AppNavTab {
    if (isAdmin) {
      switch (currentTab) {
        case 'cell-leaders':
        case 'cell-location-history':
          return 'cell-management';
        case 'report-history':
        case 'received-reports':
        case 'report-deadlines':
          return 'report-review';
        case 'learning-assignments':
        case 'learning-quizzes':
        case 'learning-participation':
        case 'learning-grades':
        case 'learning-events':
        case 'learning-materials':
          return 'learning-portal';
        case 'follow-ups':
        case 'evangelism':
        case 'finance':
        case 'materials':
        case 'messages':
        case 'call-history':
        case 'analytics':
        case 'settings':
        case 'location-sharing':
        case 'cell-management':
        case 'report-review':
        case 'learning-portal':
          return 'dashboard';
        default:
          return 'dashboard';
      }
    } else {
      switch (currentTab) {
        case 'submit-cell-meeting-report':
        case 'submit-evangelism-report':
        case 'my-reports':
        case 'cell-activity-history':
          return 'my-cell';
        case 'learning-assignments':
        case 'learning-quizzes':
        case 'learning-participation':
        case 'learning-grades':
        case 'learning-events':
        case 'learning-materials':
          return 'learning-portal';
        case 'evangelism-contacts':
        case 'follow-ups':
        case 'materials':
        case 'messages':
        case 'call-history':
        case 'my-account':
        case 'my-cell':
        case 'learning-portal':
          return 'my-dashboard';
        default:
          return 'my-dashboard';
      }
    }
  }
}

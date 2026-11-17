import { useEffect, useRef } from 'react';
import { NavigationService } from '../services/navigationService';

/**
 * Hook to register a back action interceptor (e.g. for closing a modal, detail drawer,
 * or returning from a sub-step/view before leaving the page).
 *
 * The handler should return `true` if it consumed the back event (e.g. closed modal),
 * or `false` to let default navigation proceed.
 */
export function useBackHandler(handler: () => boolean, active: boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    const unregister = NavigationService.registerInterceptor(() => {
      return handlerRef.current();
    });
    return unregister;
  }, [active]);
}

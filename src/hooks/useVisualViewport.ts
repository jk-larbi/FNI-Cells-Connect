import { useEffect, useRef, useState } from 'react';

export interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Tracks the actually visible mobile viewport. The same measurement is
 * published to CSS so the app shell and the chat composer use one source
 * of truth while the iOS/Android software keyboard is open.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    if (typeof window === 'undefined') {
      return { height: 0, width: 0, offsetTop: 0, isKeyboardVisible: false, keyboardHeight: 0 };
    }
    const vv = window.visualViewport;
    return {
      height: vv?.height ?? window.innerHeight,
      width: vv?.width ?? window.innerWidth,
      offsetTop: vv?.offsetTop ?? 0,
      isKeyboardVisible: false,
      keyboardHeight: 0,
    };
  });

  const layoutHeightRef = useRef(typeof window === 'undefined' ? 0 : window.innerHeight);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const vv = window.visualViewport;
    let orientation = window.screen.orientation?.type ?? '';

    const measure = () => {
      const visualHeight = Math.round(vv?.height ?? window.innerHeight);
      const visualWidth = Math.round(vv?.width ?? window.innerWidth);
      const offsetTop = Math.max(0, Math.round(vv?.offsetTop ?? 0));
      const active = document.activeElement;
      const editableFocused = !!active && (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      );

      const nextOrientation = window.screen.orientation?.type ?? '';
      const orientationChanged = nextOrientation !== orientation;
      if (orientationChanged) {
        orientation = nextOrientation;
        layoutHeightRef.current = Math.max(visualHeight, window.innerHeight);
      }

      // Refresh the baseline only when the keyboard is not engaged. This
      // avoids treating the keyboard-shrunken viewport as the new full height.
      const baseline = Math.max(layoutHeightRef.current, window.innerHeight);
      const heightDifference = Math.max(0, baseline - visualHeight);
      const isKeyboardVisible = editableFocused && heightDifference > 100;
      if (!editableFocused || !isKeyboardVisible) {
        layoutHeightRef.current = Math.max(visualHeight, window.innerHeight);
      }

      const keyboardHeight = isKeyboardVisible ? heightDifference : 0;
      root.style.setProperty('--fni-visible-viewport-height', `${visualHeight}px`);
      root.style.setProperty('--fni-visual-viewport-offset-top', `${offsetTop}px`);
      root.style.setProperty('--fni-keyboard-height', `${keyboardHeight}px`);

      setState(previous => {
        if (
          previous.height === visualHeight &&
          previous.width === visualWidth &&
          previous.offsetTop === offsetTop &&
          previous.isKeyboardVisible === isKeyboardVisible &&
          previous.keyboardHeight === keyboardHeight
        ) return previous;
        return {
          height: visualHeight,
          width: visualWidth,
          offsetTop,
          isKeyboardVisible,
          keyboardHeight,
        };
      });

      if (isKeyboardVisible && window.scrollY !== 0) {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    };

    vv?.addEventListener('resize', measure);
    vv?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    document.addEventListener('focusin', measure);
    document.addEventListener('focusout', measure);

    measure();
    return () => {
      vv?.removeEventListener('resize', measure);
      vv?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
      document.removeEventListener('focusin', measure);
      document.removeEventListener('focusout', measure);
      root.style.removeProperty('--fni-visible-viewport-height');
      root.style.removeProperty('--fni-visual-viewport-offset-top');
      root.style.removeProperty('--fni-keyboard-height');
    };
  }, []);

  return state;
}

import { useEffect, useState } from 'react';

export interface VisualViewportState {
  height: number;
  width: number;
  offsetTop: number;
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * useVisualViewport
 * Accurately tracks mobile software keyboards on iOS Safari / PWA and Android
 * so chat composers sit flush against the keyboard without dead space.
 */
export function useVisualViewport(): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(() => {
    if (typeof window === 'undefined') {
      return {
        height: 0,
        width: 0,
        offsetTop: 0,
        isKeyboardVisible: false,
        keyboardHeight: 0,
      };
    }
    const vv = window.visualViewport;
    const initialHeight = vv ? vv.height : window.innerHeight;
    const initialWidth = vv ? vv.width : window.innerWidth;
    return {
      height: initialHeight,
      width: initialWidth,
      offsetTop: vv ? vv.offsetTop : 0,
      isKeyboardVisible: false,
      keyboardHeight: 0,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResizeOrScroll = () => {
      const vv = window.visualViewport;
      const currentHeight = vv ? vv.height : window.innerHeight;
      const currentWidth = vv ? vv.width : window.innerWidth;
      const offsetTop = vv ? vv.offsetTop : 0;
      const windowHeight = window.innerHeight;

      // On mobile devices, when virtual keyboard appears, visualViewport.height is significantly less than window.innerHeight
      const keyboardDiff = Math.max(0, windowHeight - currentHeight);
      const isKeyboardVisible = keyboardDiff > 120;

      setState({
        height: currentHeight,
        width: currentWidth,
        offsetTop,
        isKeyboardVisible,
        keyboardHeight: isKeyboardVisible ? keyboardDiff : 0,
      });

      // Prevent iOS window scroll offset while keyboard is active
      if (isKeyboardVisible && window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleResizeOrScroll);
      vv.addEventListener('scroll', handleResizeOrScroll);
    }
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('orientationchange', handleResizeOrScroll);

    handleResizeOrScroll();

    return () => {
      if (vv) {
        vv.removeEventListener('resize', handleResizeOrScroll);
        vv.removeEventListener('scroll', handleResizeOrScroll);
      }
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('orientationchange', handleResizeOrScroll);
    };
  }, []);

  return state;
}

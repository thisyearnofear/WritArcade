import { useState, useEffect } from 'react';
import { isMobileDevice, isTouchDevice } from '@/lib/utils';

interface MobileOptimizations {
  isMobile: boolean;
  prefersReducedMotion: boolean;
  isTouchDevice: boolean;
  windowSize: {
    width: number;
    height: number;
  };
  optimized: boolean;
  getMobileClasses: (baseClasses: string, mobileClasses?: string) => string;
  getTouchClasses: (baseClasses: string, touchClasses?: string) => string;
}

export function useMobileOptimizations(): MobileOptimizations {
  // Helper functions must be declared before the useState initializer
  // so they are available in the closure (avoids TDZ in webpack bundles).
  const getMobileClasses = (isMob: boolean) => (baseClasses: string, mobileClasses: string = ''): string => {
    return `${baseClasses} ${isMob ? mobileClasses : ''}`.trim();
  };

  const getTouchClasses = (isTouch: boolean) => (baseClasses: string, touchClasses: string = ''): string => {
    return `${baseClasses} ${isTouch ? touchClasses : ''}`.trim();
  };

  const [optimizations, setOptimizations] = useState<MobileOptimizations>(() => {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            prefersReducedMotion: false,
            isTouchDevice: false,
            windowSize: { width: 0, height: 0 },
            optimized: false,
            getMobileClasses: getMobileClasses(false),
            getTouchClasses: getTouchClasses(false),
        }
    }
    const isTouch = isTouchDevice();
    const isMobile = isMobileDevice();
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
        isMobile,
        prefersReducedMotion,
        isTouchDevice: isTouch,
        windowSize: { width: window.innerWidth, height: window.innerHeight },
        optimized: isMobile || isTouch,
        getMobileClasses: getMobileClasses(isMobile),
        getTouchClasses: getTouchClasses(isTouch),
    }
  });

  useEffect(() => {
    const preventDoubleTapZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    if (optimizations.isMobile || optimizations.isTouchDevice) {
      document.addEventListener('touchmove', preventDoubleTapZoom, { passive: false });
      document.body.classList.add('mobile-device');
      if (optimizations.isTouchDevice) document.body.classList.add('touch-device');
      document.body.style.setProperty('-webkit-font-smoothing', 'antialiased');
      document.body.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
    }
    
    const handleResize = () => {
      const updatedIsMobile = isMobileDevice();
      setOptimizations(prev => ({
        ...prev,
        isMobile: updatedIsMobile,
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        getMobileClasses: getMobileClasses(updatedIsMobile),
      }));
    };

    window.addEventListener('resize', handleResize);
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e: MediaQueryListEvent) => {
      setOptimizations(prev => ({ ...prev, prefersReducedMotion: e.matches }));
    };
    
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
      document.removeEventListener('touchmove', preventDoubleTapZoom);
    };
  }, [optimizations.isMobile, optimizations.isTouchDevice]);

  return {
    ...optimizations,
  };
}
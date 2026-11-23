'use client';

import { useEffect, useRef } from 'react';

export function useInfiniteScroll(enabled: boolean, onIntersect: () => void) {
  const targetRef = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target || typeof IntersectionObserver === 'undefined') return;

    // Start the next request before the user reaches the final card.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) onIntersectRef.current();
    }, { rootMargin: '240px 0px' });

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled]);

  return targetRef;
}

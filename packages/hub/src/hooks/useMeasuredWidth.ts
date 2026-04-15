import { useEffect, useRef, useState } from 'react';

export function useMeasuredWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frameId = 0;

    const update = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        setWidth(element.getBoundingClientRect().width);
      });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(element);
    window.addEventListener('resize', update);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, width };
}
import { useEffect, useRef, useState } from "react";

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook générique basé sur IntersectionObserver.
 * Retourne [ref, isVisible] — attache ref à l'élément cible.
 * Quand l'élément entre dans le viewport, isVisible passe à true.
 */
export function useScrollReveal<T extends Element = HTMLDivElement>(
  options: ScrollRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = "0px 0px -60px 0px", once = true } = options;
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isVisible] as const;
}

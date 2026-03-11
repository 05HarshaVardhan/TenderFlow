import { useEffect, useRef, useState } from "react";

export function usePresence(open, duration = 200) {
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsMounted(true);
      setIsVisible(true);
      return undefined;
    }

    setIsVisible(false);
    timeoutRef.current = setTimeout(() => {
      setIsMounted(false);
    }, duration);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [open, duration]);

  return { isMounted, isVisible };
}

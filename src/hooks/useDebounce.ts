import { useState, useEffect } from "react";

/**
 * A hook that delays updating a value until a specified time has passed.
 * @param value - The value you want to debounce (e.g., shares amount)
 * @param delay - The delay in milliseconds (default: 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes (or component unmounts)
    // This is the core logic that prevents the update if the user is still typing
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

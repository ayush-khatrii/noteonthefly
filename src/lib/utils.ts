import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes intelligently (shadcn/ui standard helper).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

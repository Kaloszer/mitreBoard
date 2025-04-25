import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to determine background color based on count
export function getCountColorClass(count: number | undefined): string {
  const numCount = count ?? 0;
  if (numCount >= 5) {
    return "bg-blue-200";
  } else if (numCount >= 3) {
    return "bg-sky-200";
  } else if (numCount >= 1) {
    return "bg-yellow-200";
  } else {
    return "bg-white";
  }
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to determine background color based on count
export function getCountColorClass(count: number | undefined): string {
  const numCount = count ?? 0;
  if (numCount >= 5) {
    return "bg-blue-200"; // Blue for >= 5
  } else if (numCount >= 3) {
    return "bg-sky-200"; // Light blue for 3-4
  } else if (numCount >= 1) {
    return "bg-yellow-200"; // Yellow for 1-2
  } else {
    return "bg-white"; // White for 0
  }
}

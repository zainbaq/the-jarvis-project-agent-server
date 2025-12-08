import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind classes
// Similar to how you might use string concatenation in Python
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date helper
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Generate unique ID (like uuid.uuid4() in Python)
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import slugify from "slugify"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createSlug(text: string): string {
  return slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  })
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return string.startsWith('http://') || string.startsWith('https://')
  } catch (_) {
    return false
  }
}
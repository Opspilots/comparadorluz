
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function removeEmojis(str: string): string {
    if (!str) return '';
    // Remove common emoji ranges
    return str.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
}

export function normalizeNumber(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return ''
    let str = value.toString().trim()
        .replace(/[€$£¥\sA-Za-z]/g, '') // Remove currency, spaces, letters

    // Handle European format: 1.234,56 -> 1234.56
    // If it contains both . and ,
    if (str.includes('.') && str.includes(',')) {
        const dotIndex = str.indexOf('.')
        const commaIndex = str.indexOf(',')

        if (dotIndex < commaIndex) {
            // 1.234,56 -> Remove dot, replace comma with dot
            str = str.replace(/\./g, '').replace(',', '.')
        } else {
            // 1,234.56 -> Remove comma
            str = str.replace(/,/g, '')
        }
    } else if (str.includes(',')) {
        // Only comma, assume decimal separator (Spain)
        str = str.replace(',', '.')
    } else if (str.includes('.') && (str.match(/\./g) || []).length > 1) {
        // Multiple dots (1.234.567) -> remove all
        str = str.replace(/\./g, '')
    }

    // Final cleanup - Allow ONLY digits and ONE dot. No negative signs.
    return str.replace(/[^\d.]/g, '')
}

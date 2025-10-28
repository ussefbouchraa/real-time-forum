// escapeHTML: Sanitizes user input to prevent XSS attacks
export function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// formatMessage: Converts plain text with newlines into <p> blocks
export function formatMessage(message) {
  return message
    .trim()
    .split(/\n+/)
    .map(line => `<p>${line}</p>`)
    .join('');
}

// throttle: Limits function execution rate (e.g., scroll/fetch)
export function throttle(func, limit) {
    let inThrottle = false;
    let result;

    return function(...args) {
        if (inThrottle) {
            return result;
        }
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
        result = func.apply(this, args);
        return result;
    };
}

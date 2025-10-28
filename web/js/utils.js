// Utility function to prevent XSS attacks
export function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function formatMessage(message) {
  return message
    .trim()
    .split(/\n+/)
    .map(line => `<p>${line}</p>`)
    .join('');
}

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

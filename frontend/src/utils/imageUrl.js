export const formatImageUrl = (url) => {
    if (!url) return '';
    const backendBase = `http://${window.location.hostname}:8000`;

    // Handle relative paths from backend
    if (url.startsWith('/uploads/')) {
        return `${backendBase}${url}`;
    }

    // Handle hardcoded localhost/127.0.0.1 paths
    if (url.includes('127.0.0.1:8000') || url.includes('localhost:8000')) {
        return url.replace(/http:\/\/(127\.0\.0\.1|localhost):8000/, backendBase);
    }

    return url;
};

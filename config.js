// Configuration Management
const CONFIG_KEY = 'sla_monitoring_api_url';

class ConfigManager {
    constructor() {
        this.apiUrl = this.getApiUrl();
    }

    getApiUrl() {
        return localStorage.getItem(CONFIG_KEY) || '';
    }

    setApiUrl(url) {
        localStorage.setItem(CONFIG_KEY, url);
        this.apiUrl = url;
    }

    hasApiUrl() {
        return this.apiUrl && this.apiUrl.trim() !== '';
    }

    clearApiUrl() {
        localStorage.removeItem(CONFIG_KEY);
        this.apiUrl = '';
    }
}

// Export for use in app.js
window.ConfigManager = ConfigManager;

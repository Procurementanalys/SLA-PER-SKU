// SLA Monitoring Dashboard Application
class SLAMonitoringApp {
    constructor() {
        this.configManager = new ConfigManager();
        this.data = [];
        this.filteredData = [];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        // Check if API URL is configured
        if (!this.configManager.hasApiUrl()) {
            this.showConfigModal();
        } else {
            this.loadData();
        }
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadData();
        });

        // Filter inputs
        document.getElementById('poDateFrom').addEventListener('change', () => this.applyFilters());
        document.getElementById('poDateTo').addEventListener('change', () => this.applyFilters());
        document.getElementById('rcvDateFrom').addEventListener('change', () => this.applyFilters());
        document.getElementById('rcvDateTo').addEventListener('change', () => this.applyFilters());
        document.getElementById('supplierSearch').addEventListener('input', () => this.applyFilters());
        document.getElementById('contractSearch').addEventListener('input', () => this.applyFilters());
        document.getElementById('itemCodeSearch').addEventListener('input', () => this.applyFilters());

        // Clear filters button
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Table sorting
        const sortableHeaders = document.querySelectorAll('th.sortable');
        sortableHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.column;
                this.sortTable(column);
            });
        });

        // Config modal
        document.getElementById('saveConfigBtn').addEventListener('click', () => {
            this.saveConfiguration();
        });
    }

    showConfigModal() {
        const modal = document.getElementById('configModal');
        modal.classList.add('active');
    }

    hideConfigModal() {
        const modal = document.getElementById('configModal');
        modal.classList.remove('active');
    }

    saveConfiguration() {
        const apiUrl = document.getElementById('apiUrlInput').value.trim();
        
        if (!apiUrl) {
            alert('Please enter a valid API URL');
            return;
        }

        this.configManager.setApiUrl(apiUrl);
        this.hideConfigModal();
        this.loadData();
    }

    async loadData() {
        const loadingSpinner = document.getElementById('loadingSpinner');
        const errorMessage = document.getElementById('errorMessage');
        const tableContainer = document.querySelector('.table-container');
        const emptyState = document.getElementById('emptyState');

        // Show loading state
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
        tableContainer.style.display = 'none';
        emptyState.style.display = 'none';

        try {
            const response = await fetch(this.configManager.apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Handle different response formats
            this.data = result.data || result || [];
            
            // Process and calculate SLA and Average Days
            this.processData();
            
            // Apply filters and render
            this.applyFilters();
            
            // Update statistics
            this.updateStatistics();

            // Hide loading, show table
            loadingSpinner.style.display = 'none';
            
            if (this.filteredData.length > 0) {
                tableContainer.style.display = 'block';
            } else {
                emptyState.style.display = 'block';
            }

        } catch (error) {
            console.error('Error loading data:', error);
            loadingSpinner.style.display = 'none';
            errorMessage.style.display = 'block';
            document.getElementById('errorText').textContent = 
                `Failed to load data: ${error.message}. Please check your API URL configuration.`;
        }
    }

    processData() {
        this.data = this.data.map(item => {
            // Calculate SLA (Received Value / PO Value * 100)
            const poValue = parseFloat(item.poValue) || 0;
            const receivedValue = parseFloat(item.receivedValue) || 0;
            const sla = poValue > 0 ? (receivedValue / poValue * 100) : 0;

            // Calculate Average Days (Received Date - PO Date)
            const poDate = this.parseDate(item.poDate);
            const receivedDate = this.parseDate(item.receivedDate);
            const avgDays = poDate && receivedDate ? 
                Math.ceil((receivedDate - poDate) / (1000 * 60 * 60 * 24)) : 0;

            return {
                ...item,
                sla: parseFloat(sla.toFixed(2)),
                avgDays: avgDays,
                poDateObj: poDate,
                receivedDateObj: receivedDate
            };
        });
    }

    parseDate(dateString) {
        if (!dateString) return null;
        
        // Try to parse different date formats
        // Format: DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1; // Month is 0-indexed
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }
        
        // Fallback to standard date parsing
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    applyFilters() {
        const poDateFrom = document.getElementById('poDateFrom').value;
        const poDateTo = document.getElementById('poDateTo').value;
        const rcvDateFrom = document.getElementById('rcvDateFrom').value;
        const rcvDateTo = document.getElementById('rcvDateTo').value;
        const supplierSearch = document.getElementById('supplierSearch').value.toLowerCase();
        const contractSearch = document.getElementById('contractSearch').value.toLowerCase();
        const itemCodeSearch = document.getElementById('itemCodeSearch').value.toLowerCase();

        this.filteredData = this.data.filter(item => {
            // Filter by PO Date
            if (poDateFrom && item.poDateObj && item.poDateObj < new Date(poDateFrom)) {
                return false;
            }
            if (poDateTo && item.poDateObj && item.poDateObj > new Date(poDateTo)) {
                return false;
            }

            // Filter by Received Date
            if (rcvDateFrom && item.receivedDateObj && item.receivedDateObj < new Date(rcvDateFrom)) {
                return false;
            }
            if (rcvDateTo && item.receivedDateObj && item.receivedDateObj > new Date(rcvDateTo)) {
                return false;
            }

            // Filter by Supplier
            if (supplierSearch && !item.supplierName.toLowerCase().includes(supplierSearch)) {
                return false;
            }

            // Filter by Contract
            if (contractSearch && !item.contract.toLowerCase().includes(contractSearch)) {
                return false;
            }

            // Filter by Item Code
            if (itemCodeSearch && !item.itemCode.toLowerCase().includes(itemCodeSearch)) {
                return false;
            }

            return true;
        });

        this.renderTable();
        this.updateStatistics();
    }

    clearFilters() {
        document.getElementById('poDateFrom').value = '';
        document.getElementById('poDateTo').value = '';
        document.getElementById('rcvDateFrom').value = '';
        document.getElementById('rcvDateTo').value = '';
        document.getElementById('supplierSearch').value = '';
        document.getElementById('contractSearch').value = '';
        document.getElementById('itemCodeSearch').value = '';

        this.applyFilters();
    }

    sortTable(column) {
        // Toggle sort direction
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }

        // Sort data
        this.filteredData.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle numeric values
            if (column === 'qtyPO' || column === 'qtyReceived' || 
                column === 'poValue' || column === 'receivedValue' || 
                column === 'sla' || column === 'avgDays') {
                aVal = parseFloat(aVal) || 0;
                bVal = parseFloat(bVal) || 0;
            }

            // Handle dates
            if (column === 'poDate' || column === 'receivedDate') {
                aVal = a[column + 'Obj'] || new Date(0);
                bVal = b[column + 'Obj'] || new Date(0);
            }

            if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Update sort indicators
        document.querySelectorAll('th.sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const activeHeader = document.querySelector(`th[data-column="${column}"]`);
        if (activeHeader) {
            activeHeader.classList.add(`sort-${this.sortDirection}`);
        }

        this.renderTable();
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        const emptyState = document.getElementById('emptyState');
        const tableContainer = document.querySelector('.table-container');

        if (this.filteredData.length === 0) {
            tbody.innerHTML = '';
            tableContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tableContainer.style.display = 'block';
        emptyState.style.display = 'none';

        tbody.innerHTML = this.filteredData.map(item => `
            <tr class="fade-in">
                <td>${this.escapeHtml(item.nomorPO || '')}</td>
                <td>${this.escapeHtml(item.itemCode || '')}</td>
                <td>${this.escapeHtml(item.itemName || '')}</td>
                <td>${this.escapeHtml(item.supplierName || '')}</td>
                <td>${this.escapeHtml(item.contract || '')}</td>
                <td>${this.escapeHtml(item.poDate || '')}</td>
                <td class="number">${this.formatNumber(item.qtyPO)}</td>
                <td class="currency">${this.formatCurrency(item.poValue)}</td>
                <td>${this.escapeHtml(item.receivedDate || '')}</td>
                <td class="number">${this.formatNumber(item.qtyReceived)}</td>
                <td class="currency">${this.formatCurrency(item.receivedValue)}</td>
                <td class="sla">
                    <span class="sla-badge ${this.getSLAClass(item.sla)}">
                        ${item.sla.toFixed(2)}%
                    </span>
                </td>
                <td class="number">${item.avgDays} days</td>
            </tr>
        `).join('');

        // Update record count
        document.getElementById('recordCount').textContent = 
            `${this.filteredData.length} record${this.filteredData.length !== 1 ? 's' : ''}`;
    }

    getSLAClass(sla) {
        if (sla >= 80) return 'sla-excellent';
        if (sla >= 60) return 'sla-good';
        if (sla >= 40) return 'sla-average';
        return 'sla-poor';
    }

    updateStatistics() {
        const totalPO = new Set(this.filteredData.map(item => item.nomorPO)).size;
        const totalItems = this.filteredData.length;
        const avgSLA = this.filteredData.length > 0 
            ? this.filteredData.reduce((sum, item) => sum + item.sla, 0) / this.filteredData.length 
            : 0;
        const avgDays = this.filteredData.length > 0 
            ? this.filteredData.reduce((sum, item) => sum + item.avgDays, 0) / this.filteredData.length 
            : 0;

        document.getElementById('totalPO').textContent = totalPO;
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('avgSLA').textContent = avgSLA.toFixed(2) + '%';
        document.getElementById('avgDays').textContent = Math.round(avgDays) + ' days';
    }

    formatNumber(value) {
        const num = parseFloat(value) || 0;
        return num.toLocaleString('id-ID');
    }

    formatCurrency(value) {
        const num = parseFloat(value) || 0;
        return 'Rp ' + num.toLocaleString('id-ID', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    exportToCSV() {
        if (this.filteredData.length === 0) {
            alert('No data to export');
            return;
        }

        // Create CSV header
        const headers = [
            'Nomor PO', 'Item Code', 'Item Name', 'Supplier Name', 'Contract/Principal',
            'PO Date', 'Qty PO', 'PO Value', 'Received Date', 'Qty Received', 
            'Received Value', 'SLA (%)', 'Avg Days'
        ];

        // Create CSV rows
        const rows = this.filteredData.map(item => [
            item.nomorPO,
            item.itemCode,
            item.itemName,
            item.supplierName,
            item.contract,
            item.poDate,
            item.qtyPO,
            item.poValue,
            item.receivedDate,
            item.qtyReceived,
            item.receivedValue,
            item.sla.toFixed(2),
            item.avgDays
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `SLA_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SLAMonitoringApp();
});

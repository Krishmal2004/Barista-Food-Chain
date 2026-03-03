// Custom Reports Logic using Supabase

let reports = [];
let currentReportId = null;
let chartsInstances = {};
let allBranches = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Mobile sidebar toggle behavior
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });
    }

    await fetchBranches();
    await loadReports();
});

// Modal Logic
let reportModalElement;
let reportModalInstance;

function getReportModal() {
    if (!reportModalElement) {
        reportModalElement = document.getElementById('reportModal');
        reportModalInstance = new bootstrap.Modal(reportModalElement);
    }
    return reportModalInstance;
}

function toggleBranchSelect() {
    const isChecked = document.getElementById('widgetBranchPerformance').checked;
    const container = document.getElementById('branchSelectContainer');
    if (isChecked) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
        document.getElementById('branchSelect').value = '';
    }
}

async function fetchBranches() {
    try {
        const res = await fetch('/api/reviews/branches');
        if (res.ok) {
            allBranches = await res.json();
            const select = document.getElementById('branchSelect');
            select.innerHTML = '<option value="">-- Choose Branch --</option>' + allBranches.map(b =>
                `<option value="${b.branch_name || b.branch_id}">${b.branch_name || b.business_name || 'Branch #' + b.branch_id}</option>`
            ).join('');
        }
    } catch (err) {
        console.error("Failed to load branches", err);
    }
}

async function loadReports() {
    try {
        const res = await fetch('/api/custom-reports');
        if (res.ok) {
            reports = await res.json();
        } else {
            reports = [];
        }
    } catch (err) {
        console.error("Failed to load reports from Supabase", err);
        reports = [];
    }
    renderReportsList();
}

function openCreateReportModal() {
    document.getElementById('reportForm').reset();
    document.getElementById('reportId').value = '';
    document.getElementById('reportModalTitle').innerHTML = '<i class="bi bi-plus-circle me-2"></i>Create Custom Report';
    toggleBranchSelect();
    getReportModal().show();
}

function openEditReportModal(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    document.getElementById('reportForm').reset();
    document.getElementById('reportId').value = report.id;
    document.getElementById('formReportTitle').value = report.title;

    // Check widgets
    report.widgets.forEach(w => {
        if (w.startsWith('branchPerformance:')) {
            const branchId = w.substring(18);
            const checkbox = document.querySelector(`.widget-checkbox[value="branchPerformance"]`);
            if (checkbox) checkbox.checked = true;
            toggleBranchSelect();
            document.getElementById('branchSelect').value = branchId;
        } else {
            const checkbox = document.querySelector(`.widget-checkbox[value="${w}"]`);
            if (checkbox) checkbox.checked = true;
        }
    });

    document.getElementById('reportModalTitle').innerHTML = '<i class="bi bi-pencil me-2"></i>Edit Custom Report';
    getReportModal().show();
}

function getSelectedWidgets() {
    const checkboxes = document.querySelectorAll('.widget-checkbox:checked');
    let selected = [];
    checkboxes.forEach(cb => {
        if (cb.value === 'branchPerformance') {
            const branchId = document.getElementById('branchSelect').value;
            if (branchId) {
                selected.push(`branchPerformance:${branchId}`);
            }
        } else {
            selected.push(cb.value);
        }
    });
    return selected;
}

// Save Report (Create or Update)
async function saveReport() {
    const title = document.getElementById('formReportTitle').value.trim();
    const id = document.getElementById('reportId').value;
    const widgets = getSelectedWidgets();

    if (!title) {
        alert('Report Title is required.');
        return;
    }

    if (widgets.length === 0) {
        alert('Please select at least one widget for the report. For branch performance, make sure a branch is selected.');
        return;
    }

    document.getElementById('reportSubmitBtn').disabled = true;

    try {
        if (id) {
            // Update
            const res = await fetch(`/api/custom-reports/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, widgets })
            });
            if (!res.ok) throw new Error("Update failed");
        } else {
            // Create
            const res = await fetch(`/api/custom-reports`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, widgets })
            });
            if (!res.ok) throw new Error("Create failed");
        }

        await loadReports();
        getReportModal().hide();

        if (currentReportId === id) {
            viewReport(id);
        }
    } catch (err) {
        alert("Failed to save report: " + err.message);
    } finally {
        document.getElementById('reportSubmitBtn').disabled = false;
    }
}

async function deleteReport(id, event) {
    if (event) event.stopPropagation();

    if (confirm('Are you sure you want to delete this custom report?')) {
        try {
            const res = await fetch(`/api/custom-reports/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Delete failed");
            await loadReports();
        } catch (err) {
            alert("Failed to delete report: " + err.message);
        }
    }
}

async function deleteCurrentReport() {
    if (currentReportId) {
        if (confirm('Are you sure you want to delete this custom report?')) {
            try {
                const res = await fetch(`/api/custom-reports/${currentReportId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Delete failed");
                await loadReports();
                closeSingleReport();
            } catch (err) {
                alert("Failed to delete report: " + err.message);
            }
        }
    }
}

function editCurrentReport() {
    if (currentReportId) {
        openEditReportModal(currentReportId);
    }
}

// Render the grid of available reports
function renderReportsList() {
    const grid = document.getElementById('reportsGrid');
    const noReportsMsg = document.getElementById('noReportsMessage');

    grid.innerHTML = '';

    if (reports.length === 0) {
        noReportsMsg.classList.remove('hidden');
    } else {
        noReportsMsg.classList.add('hidden');

        reports.forEach(report => {
            const dateStr = new Date(report.created_at).toLocaleDateString();
            const widgetCount = Array.isArray(report.widgets) ? report.widgets.length : 0;

            const cardHtml = `
                <div class="col-md-6 col-lg-4">
                    <div class="report-card" onclick="viewReport('${report.id}')">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <h5 class="mb-0 text-truncate" title="${report.title}">${report.title}</h5>
                            <button class="btn btn-sm btn-light text-danger" onclick="deleteReport('${report.id}', event)">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <div class="text-muted small mb-3">
                            <i class="bi bi-calendar3 me-1"></i> Created ${dateStr}
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="badge bg-primary-subtle text-primary me-2">${widgetCount} Widgets</span>
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += cardHtml;
        });
    }
}

function closeSingleReport() {
    document.getElementById('singleReportContainer').classList.add('hidden');
    document.querySelectorAll('.topbar h5')[0].innerText = "Custom Reports";
    document.getElementById('reportsListContainer').classList.remove('hidden');
    currentReportId = null;
    cleanupCharts();
    renderReportsList();
}

function viewReport(id) {
    const report = reports.find(r => r.id === id);
    if (!report) return;

    currentReportId = id;

    document.getElementById('reportsListContainer').classList.add('hidden');
    document.getElementById('singleReportContainer').classList.remove('hidden');
    document.getElementById('reportTitle').innerText = report.title;

    renderWidgets(report.widgets || []);
}

// ----- WIDGET RENDERING && CHART LOGIC ----- //

function cleanupCharts() {
    Object.keys(chartsInstances).forEach(key => {
        if (chartsInstances[key]) {
            chartsInstances[key].destroy();
        }
    });
    chartsInstances = {};
}

async function renderWidgets(widgets) {
    cleanupCharts();
    const area = document.getElementById('reportWidgetsArea');
    area.innerHTML = '';

    widgets.forEach(w => {
        if (w === 'dashboardStats') {
            area.innerHTML += `
                <div class="col-12" id="widget-dashboardStats-container">
                    <div class="row g-4 mb-4" id="placeholder-stats">
                        <div class="col-12 text-center py-2"><div class="spinner-border spinner-border-sm"></div></div>
                    </div>
                </div>
            `;
            fetchDashboardStats();
        }
        else if (w === 'reviewTrends') {
            area.innerHTML += `
                <div class="col-lg-8" id="widget-trends">
                    <div class="dashboard-card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Overall Review Trends (Past Year)</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="customReviewTrendsChart" height="100"></canvas>
                        </div>
                    </div>
                </div>
            `;
            renderReviewTrendsChart();
        }
        else if (w === 'sentimentDist') {
            area.innerHTML += `
                <div class="col-lg-4" id="widget-sentiment">
                    <div class="dashboard-card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Overall Sentiment Distribution</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="customSentimentChart" height="200"></canvas>
                        </div>
                    </div>
                </div>
            `;
            renderSentimentChart();
        }
        else if (w === 'topBranches') {
            area.innerHTML += `
                <div class="col-lg-12" id="widget-branches">
                    <div class="dashboard-card h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Top Performing Branches</h5>
                        </div>
                        <div class="card-body" id="customTopBranchesList">
                            <div class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></div>
                        </div>
                    </div>
                </div>
            `;
            fetchTopBranches();
        }
        else if (w.startsWith('branchPerformance:')) {
            const branchId = w.substring(18);
            const branchInfo = allBranches.find(b => b.branch_name == branchId || b.branch_id == branchId) || {};
            const displayBranchName = branchInfo.branch_name || branchInfo.business_name || branchId;

            // id must not have spaces
            const safeId = branchId.replace(/[^a-zA-Z0-9]/g, '-');

            area.innerHTML += `
                <div class="col-12" id="widget-branch-${safeId}">
                    <div class="dashboard-card h-100 mb-4">
                        <div class="card-header bg-primary-subtle text-primary border-bottom-0">
                            <h5 class="mb-0"><i class="bi bi-shop me-2"></i>Branch Performance: ${displayBranchName}</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-lg-8 mb-4 mb-lg-0">
                                    <h6 class="text-muted small text-uppercase mb-3">Review Volume (Past Year)</h6>
                                    <div style="position: relative; height: 250px; width: 100%;">
                                        <canvas id="branchTrendChart_${safeId}"></canvas>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <h6 class="text-muted small text-uppercase mb-3">Sentiment Split</h6>
                                    <div style="position: relative; height: 250px; width: 100%;">
                                        <canvas id="branchSentimentChart_${safeId}"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            renderSpecificBranchCharts(branchId);
        }
    });
}

// ----- DATA FETCHERS ----- //

async function fetchDashboardStats() {
    try {
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            const container = document.getElementById('placeholder-stats');

            container.innerHTML = `
                <div class="col-lg-3 col-md-6">
                    <div class="stat-card h-100">
                        <div class="stat-icon bg-primary-subtle text-primary"><i class="bi bi-chat-left-quote-fill"></i></div>
                        <div class="stat-info">
                            <h3 class="stat-value">${stats.totalReviews.toLocaleString()}</h3>
                            <p class="stat-label">Total Reviews</p>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="stat-card h-100">
                        <div class="stat-icon bg-success-subtle text-success"><i class="bi bi-emoji-smile-fill"></i></div>
                        <div class="stat-info">
                            <h3 class="stat-value">${stats.positiveSentiment}</h3>
                            <p class="stat-label">Positive Sentiment</p>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="stat-card h-100">
                        <div class="stat-icon bg-warning-subtle text-warning"><i class="bi bi-shop"></i></div>
                        <div class="stat-info">
                            <h3 class="stat-value">${stats.activeBranches.toLocaleString()}</h3>
                            <p class="stat-label">Active Branches</p>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6">
                    <div class="stat-card h-100">
                        <div class="stat-icon bg-danger-subtle text-danger"><i class="bi bi-people-fill"></i></div>
                        <div class="stat-info">
                            <h3 class="stat-value">${stats.registeredUsers.toLocaleString()}</h3>
                            <p class="stat-label">Registered Users</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        console.error("Custom Report: Could not fetch dashboard stats", e);
    }
}

async function renderReviewTrendsChart() {
    try {
        const days = 365;
        const response = await fetch('/api/reviews?limit=10000');
        const reviews = response.ok ? await response.json() : [];

        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);

        const filteredReviews = reviews.filter(r => r.review_date && new Date(r.review_date) >= cutoffDate);

        let labels = [];
        let dataMap = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!labels.includes(label)) {
                labels.push(label);
                dataMap[label] = 0;
            }
        }

        filteredReviews.forEach(r => {
            const label = new Date(r.review_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (dataMap[label] !== undefined) dataMap[label]++;
        });

        const ctx = document.getElementById('customReviewTrendsChart').getContext('2d');
        chartsInstances['reviewTrends'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reviews',
                    data: labels.map(l => dataMap[l]),
                    borderColor: '#c0a062',
                    backgroundColor: 'rgba(192, 160, 98, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (e) {
        console.error("Custom Report: Could not load review trends", e);
    }
}

async function renderSentimentChart() {
    try {
        const [apiStatsRes, proxyStatsRes] = await Promise.all([
            fetch('/api/reviews/stats'),
            fetch('http://localhost:5000/api/reviews/stats').catch(() => null)
        ]);

        let pos = 0, neu = 0, neg = 0;

        if (proxyStatsRes && proxyStatsRes.ok) {
            const data = await proxyStatsRes.json();
            pos = data.positive_count || 0;
            neu = data.neutral_count || 0;
            neg = data.negative_count || 0;
        } else if (apiStatsRes.ok) {
            const stats = await apiStatsRes.json();
            pos = parseInt(stats.positiveSentiment) || 0;
            neu = 0; neg = 0;
        }

        const ctx = document.getElementById('customSentimentChart').getContext('2d');
        chartsInstances['sentiment'] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [pos, neu, neg],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true } } }
            }
        });
    } catch (e) {
        console.error("Custom Report: Could not load sentiment stats", e);
    }
}

async function fetchTopBranches() {
    try {
        const response = await fetch('/api/reviews/branches');
        if (response.ok) {
            const branches = await response.json();
            const container = document.getElementById('customTopBranchesList');

            if (!branches || branches.length === 0) {
                container.innerHTML = `<p class="text-center text-muted">No branch data available.</p>`;
                return;
            }

            // The /api/reviews/branches returns them sorted by total_reviews or avg_rating depending on python logic,
            // let's manually sort them by avg_rating and fallback to reviews
            const sortedBranches = branches.sort((a, b) => b.avg_rating - a.avg_rating || b.total_reviews - a.total_reviews);
            const topBranches = sortedBranches.slice(0, 5);

            container.innerHTML = topBranches.map((branch, index) => {
                const branchName = branch.branch_name || branch.business_name || 'Branch #' + branch.branch_id;
                return `
                    <div class="branch-item" style="display:flex; align-items:center; padding: 12px; border-bottom: 1px solid #f0f0f0;">
                        <div class="branch-rank" style="font-weight:bold; width:30px; color:#c0a062;">#${index + 1}</div>
                        <div class="branch-info" style="flex:1;">
                            <div class="branch-name" style="font-weight:600;">${branchName}</div>
                            <div class="branch-location" style="font-size:0.85rem; color:#6c757d;">${branch.city || ''}</div>
                        </div>
                        <div class="branch-stats" style="text-align:right;">
                            <span class="badge bg-warning text-dark"><i class="bi bi-star-fill"></i> ${(branch.avg_rating || 0).toFixed(1)}</span>
                            <a href="reviews.html?branch=${encodeURIComponent(branchName)}" class="btn btn-sm btn-outline-primary py-0 px-2 ms-2" style="font-size: 0.8rem">Details</a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        console.error("Custom Report: Could not fetch branch data", e);
    }
}

async function renderSpecificBranchCharts(branchId) {
    try {
        // Fetch all reviews and filter manually (simpler than robust API filtering)
        const response = await fetch('/api/reviews?limit=2000');
        const allReviews = response.ok ? await response.json() : [];

        // Filter reviews for THIS specific branch specifically
        const branchReviews = allReviews.filter(r =>
            (r.business_name && r.business_name == branchId) ||
            (r.branch_id && r.branch_id == branchId) ||
            (r.branch && r.branch.branch_id == branchId)
        );

        // 1. Plot branch trends
        const days = 365;
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);

        let labels = [];
        let dataMap = {};

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (!labels.includes(label)) {
                labels.push(label);
                dataMap[label] = 0;
            }
        }

        let posCount = 0;
        let neuCount = 0;
        let negCount = 0;

        branchReviews.forEach(r => {
            if (r.review_date && new Date(r.review_date) >= cutoffDate) {
                const label = new Date(r.review_date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (dataMap[label] !== undefined) dataMap[label]++;
            }

            // Calculate sentiment manually for the branch
            const text = (r.review_text || "").toLowerCase();
            const rating = r.rating || 3;
            if (rating >= 4 || text.includes('excellent') || text.includes('great') || text.includes('good')) posCount++;
            else if (rating <= 2 || text.includes('bad') || text.includes('poor')) negCount++;
            else neuCount++;
        });

        // Review Trends Line Chart
        const safeId = branchId.replace(/[^a-zA-Z0-9]/g, '-');
        const ctxTrend = document.getElementById(`branchTrendChart_${safeId}`).getContext('2d');
        chartsInstances[`branchTrend_${safeId}`] = new Chart(ctxTrend, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reviews',
                    data: labels.map(l => dataMap[l]),
                    backgroundColor: '#0d6efd',
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } }
            }
        });

        // Sentiment Doughnut Chart
        const ctxSent = document.getElementById(`branchSentimentChart_${safeId}`).getContext('2d');
        chartsInstances[`branchSent_${safeId}`] = new Chart(ctxSent, {
            type: 'pie',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [posCount, neuCount, negCount],
                    backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { padding: 10, usePointStyle: true, boxWidth: 8 } } }
            }
        });


    } catch (err) {
        console.error("Error setting up branch chart:", err);
    }
}

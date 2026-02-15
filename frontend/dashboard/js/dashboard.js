// Dashboard JavaScript Functions

// Sidebar Toggle for Mobile
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // Load dashboard data if on user.html
    if (document.getElementById('reviewTrendsChart')) {
        loadDashboardData();
    }
});

// Load all dashboard data
async function loadDashboardData() {
    console.log('📊 Loading dashboard data...');
    
    try {
        // Fetch dashboard statistics
        const statsResponse = await fetch('/api/dashboard/stats');
        if (statsResponse.ok) {
            const stats = await statsResponse.json();
            console.log('✅ Dashboard stats loaded:', stats);
            updateDashboardStats(stats);
        } else {
            console.error('❌ Failed to fetch dashboard stats');
        }
        
        // Fetch recent reviews
        const reviewsResponse = await fetch('/api/reviews?limit=10');
        if (reviewsResponse.ok) {
            const reviews = await reviewsResponse.json();
            console.log('✅ Recent reviews loaded:', reviews.length, 'reviews');
            updateRecentReviews(reviews);
        } else {
            console.error('❌ Failed to fetch recent reviews');
        }
        
        // Initialize charts with real data
        await initReviewTrendsChart();
        await initSentimentChart();
        
        console.log('✅ Dashboard data loaded successfully');
    } catch (err) {
        console.error('❌ Error loading dashboard data:', err);
    }
}

// Update dashboard statistics cards
function updateDashboardStats(stats) {
    console.log('Updating dashboard stats:', stats);
    
    // Update Total Reviews
    const totalReviewsEl = document.querySelector('.stat-card:nth-child(1) .stat-value');
    if (totalReviewsEl) {
        totalReviewsEl.textContent = stats.totalReviews.toLocaleString();
    }
    
    // Update Positive Sentiment
    const positiveSentimentEl = document.querySelector('.stat-card:nth-child(2) .stat-value');
    if (positiveSentimentEl) {
        positiveSentimentEl.textContent = stats.positiveSentiment;
    }
    
    // Update Active Branches
    const activeBranchesEl = document.querySelector('.stat-card:nth-child(3) .stat-value');
    if (activeBranchesEl) {
        activeBranchesEl.textContent = stats.activeBranches.toLocaleString();
    }
    
    // Update Registered Users
    const registeredUsersEl = document.querySelector('.stat-card:nth-child(4) .stat-value');
    if (registeredUsersEl) {
        registeredUsersEl.textContent = stats.registeredUsers.toLocaleString();
    }

    // Update stat change indicators
    const statChanges = document.querySelectorAll('.stat-change');
    if (stats.totalReviews > 0) {
        statChanges[0].innerHTML = '<i class="bi bi-arrow-up"></i> From database';
        statChanges[1].innerHTML = '<i class="bi bi-arrow-up"></i> Real-time data';
        statChanges[2].innerHTML = '<i class="bi bi-arrow-up"></i> Active locations';
        statChanges[3].innerHTML = '<i class="bi bi-arrow-up"></i> Registered';
    }
}

// Update recent reviews section
function updateRecentReviews(reviews) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList || !reviews || reviews.length === 0) {
        console.log('No reviews to display or activity list not found');
        return;
    }
    
    console.log('Updating recent reviews list with', reviews.length, 'reviews');
    
    activityList.innerHTML = reviews.slice(0, 3).map(review => {
        const sentiment = review.sentiment_score || 'neutral';
        const rating = review.review_rating || 0;
        const badgeClass = rating >= 4 ? 'success' : (rating >= 3 ? 'warning' : 'danger');
        const iconClass = rating >= 4 ? 'success' : (rating >= 3 ? 'warning' : 'danger');
        const timeAgo = formatTimeAgo(new Date(review.review_date || Date.now()));
        const reviewText = review.review_text || 'No comment';
        const truncatedText = reviewText.length > 60 ? reviewText.substring(0, 60) + '...' : reviewText;
        
        return `
            <div class="activity-item">
                <div class="activity-icon bg-${iconClass}-subtle">
                    <i class="bi bi-star-fill text-${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${rating} Star Review - ${review.business_name || 'Unknown Branch'}</div>
                    <div class="activity-text">"${truncatedText}"</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                <div class="activity-rating">
                    <span class="badge bg-${badgeClass}">${rating}.0</span>
                </div>
            </div>
        `;
    }).join('');
}

// Review Trends Chart with real data
async function initReviewTrendsChart() {
    try {
        console.log('📈 Initializing review trends chart...');
        const response = await fetch('/api/reviews?limit=200');
        const reviews = response.ok ? await response.json() : [];
        
        console.log('Loaded', reviews.length, 'reviews for trends chart');
        
        // Group reviews by day of week
        const dayCount = {
            'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
        };
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        reviews.forEach(review => {
            if (review.review_date) {
                const date = new Date(review.review_date);
                const dayName = dayNames[date.getDay()];
                if (dayCount[dayName] !== undefined) {
                    dayCount[dayName]++;
                }
            }
        });
        
        console.log('Day distribution:', dayCount);
        
        const ctx = document.getElementById('reviewTrendsChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Reviews',
                    data: [
                        dayCount['Mon'],
                        dayCount['Tue'],
                        dayCount['Wed'],
                        dayCount['Thu'],
                        dayCount['Fri'],
                        dayCount['Sat'],
                        dayCount['Sun']
                    ],
                    borderColor: '#c0a062',
                    backgroundColor: 'rgba(192, 160, 98, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#c0a062',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Reviews: ' + context.parsed.y;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Review trends chart initialized');
    } catch (err) {
        console.error('❌ Error loading review trends:', err);
    }
}

// Sentiment Distribution Chart with real data
async function initSentimentChart() {
    try {
        console.log('📊 Initializing sentiment chart...');
        const response = await fetch('/api/reviews/stats');
        const stats = response.ok ? await response.json() : { positive: 0, neutral: 0, negative: 0 };
        
        console.log('Sentiment stats:', stats);
        
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Positive', 'Neutral', 'Negative'],
                datasets: [{
                    data: [stats.positive, stats.neutral, stats.negative],
                    backgroundColor: [
                        '#28a745',
                        '#ffc107',
                        '#dc3545'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ Sentiment chart initialized');
    } catch (err) {
        console.error('❌ Error loading sentiment chart:', err);
    }
}

// Helper function to format time ago
function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    if (seconds < 2592000) return Math.floor(seconds / 604800) + ' weeks ago';
    if (seconds < 31536000) return Math.floor(seconds / 2592000) + ' months ago';
    return Math.floor(seconds / 31536000) + ' years ago';
}
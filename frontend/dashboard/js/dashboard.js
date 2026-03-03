// Dashboard JavaScript Functions

let reviewTrendsChartInstance = null;
// Sidebar Toggle for Mobile
document.addEventListener('DOMContentLoaded', function () {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function () {
            sidebar.classList.toggle('active');
        });
    }

    // Load dashboard data if on user.html
    if (document.getElementById('reviewTrendsChart')) {
        loadDashboardData();

        if (trendTimeFilter) {
            trendTimeFilter.addEventListener('change', function (e) {
                initReviewTrendsChart(parseInt(e.target.value));
            });
        }
    }

    // Initialize floating chatbot on all pages except chatbot.html
    initFloatingChatbot();

    // Populate logged-in user details
    const sessionStr = localStorage.getItem('supabase_session');
    if (sessionStr) {
        try {
            const session = JSON.parse(sessionStr);
            const user = session?.user;

            if (user) {
                const userNameEl = document.querySelector('.user-profile .user-name');
                const userRoleEl = document.querySelector('.user-profile .user-role');
                if (userNameEl) {
                    userNameEl.textContent = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
                }
                if (userRoleEl) {
                    userRoleEl.textContent = 'Administrator'; // Default fallback, could be updated if role is stored
                }

                // Also update the profile page inputs if they exist
                const nameInput = document.getElementById('addFullName');
                const emailInput = document.getElementById('addEmail');
                if (nameInput) nameInput.value = user.user_metadata?.full_name || '';
                if (emailInput) {
                    emailInput.value = user.email || '';
                    emailInput.disabled = true; // Email usually shouldn't be edited
                }
            }
        } catch (e) {
            console.error('Failed to parse session data from localStorage', e);
        }
    } else if (window.location.pathname.includes('/dashboard/') && !window.location.pathname.includes('login.html')) {
        // If not logged in, they probably shouldn't be here (basic client-side protection)
        // window.location.href = '../login.html';
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

        // Fetch top performing branches
        const branchesResponse = await fetch('/api/reviews/branches');
        if (branchesResponse.ok) {
            const branches = await branchesResponse.json();
            console.log('✅ Branch data loaded:', branches.length, 'branches');
            updateTopBranches(branches);
        } else {
            console.error('❌ Failed to fetch branch data');
            updateTopBranches([]);
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

    // Get all stat value elements by position
    const statValues = document.querySelectorAll('.stat-card .stat-value');

    // Update Total Reviews (1st card)
    if (statValues[0]) {
        statValues[0].textContent = stats.totalReviews.toLocaleString();
    }

    // Update Positive Sentiment (2nd card)
    if (statValues[1]) {
        statValues[1].textContent = stats.positiveSentiment;
    }

    // Update Active Branches (3rd card)
    if (statValues[2]) {
        statValues[2].textContent = stats.activeBranches.toLocaleString();
    }

    // Update Registered Users (4th card)
    if (statValues[3]) {
        statValues[3].textContent = stats.registeredUsers.toLocaleString();
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

// Update top performing branches section
function updateTopBranches(branches) {
    const container = document.getElementById('topBranchesList');
    if (!container) return;

    if (!branches || branches.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-building fs-1"></i>
                <p class="mt-2">No branch data available</p>
                <small>Run the ML service to generate branch analytics</small>
            </div>
        `;
        return;
    }

    // Sort branches by average rating (descending), then by review count
    const sortedBranches = [...branches].sort((a, b) => {
        const ratingA = a.avg_rating || 0;
        const ratingB = b.avg_rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.total_reviews || 0) - (a.total_reviews || 0);
    });

    // Take top 5
    const topBranches = sortedBranches.slice(0, 5);

    container.innerHTML = topBranches.map((branch, index) => {
        const rating = (branch.avg_rating || 0).toFixed(1);
        const reviewCount = branch.total_reviews || 0;
        const branchName = branch.branch_name || branch.business_name || 'Unknown';
        const location = branch.city || branch.address || '';

        return `
            <div class="branch-item">
                <div class="branch-rank">${index + 1}</div>
                <div class="branch-info">
                    <div class="branch-name">${branchName}</div>
                    <div class="branch-location">${location}</div>
                </div>
                <div class="branch-stats">
                    <div class="rating">
                        <i class="bi bi-star-fill text-warning"></i>
                        <span>${rating}</span>
                    </div>
                    <div class="reviews-count">${reviewCount} reviews</div>
                </div>
            </div>
        `;
    }).join('');
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
async function initReviewTrendsChart(days = 7) {
    try {
        console.log(`📈 Initializing review trends chart for last ${days} days...`);
        // Use a larger limit for longer periods to get more accuracy
        const limit = days > 30 ? 1000 : 200;
        const response = await fetch(`/api/reviews?limit=${limit}`);
        const reviews = response.ok ? await response.json() : [];

        console.log(`Loaded ${reviews.length} reviews for trends chart`);

        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);

        // Filter reviews within the date range
        const filteredReviews = reviews.filter(review => {
            if (!review.review_date) return false;
            return new Date(review.review_date) >= cutoffDate;
        });

        let labels = [];
        let dataMap = {};

        if (days <= 30) {
            // Group by Day
            for (let i = days - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                labels.push(label);
                dataMap[label] = 0;
            }

            filteredReviews.forEach(review => {
                const d = new Date(review.review_date);
                const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                if (dataMap[label] !== undefined) {
                    dataMap[label]++;
                }
            });
        } else {
            // Group by Month
            const monthsCount = Math.ceil(days / 30);
            for (let i = monthsCount - 1; i >= 0; i--) {
                const d = new Date();
                // Avoid dropping days incorrectly by setting to day 1 first
                d.setDate(1);
                d.setMonth(now.getMonth() - i);
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                if (!labels.includes(label)) {
                    labels.push(label);
                    dataMap[label] = 0;
                }
            }

            filteredReviews.forEach(review => {
                const d = new Date(review.review_date);
                const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                if (dataMap[label] !== undefined) {
                    dataMap[label]++;
                }
            });
        }

        const dataPoints = labels.map(label => dataMap[label]);

        const ctx = document.getElementById('reviewTrendsChart').getContext('2d');

        if (reviewTrendsChartInstance) {
            reviewTrendsChartInstance.destroy();
        }

        reviewTrendsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Reviews',
                    data: dataPoints,
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
                            label: function (context) {
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
                            label: function (context) {
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

// ============== FLOATING CHATBOT ============== //
function initFloatingChatbot() {
    // Don't show floating button on the main chatbot page to avoid double chat interactions
    if (window.location.pathname.includes('chatbot.html')) return;

    // Inject HTML for the floating button and window
    const chatbotHTML = `
        <button id="floatingChatBtn" class="floating-chat-btn">
            <i class="bi bi-chat-dots-fill"></i>
        </button>
        
        <div id="floatingChatWindow" class="floating-chat-window">
            <div class="floating-chat-header">
                <div class="floating-chat-header-info">
                    <h6>Barista AI Assistant</h6>
                    <div class="floating-chat-header-status">
                        <span class="status-dot"></span> Online
                    </div>
                </div>
                <button id="floatingChatCloseBtn" class="floating-chat-close">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
            
            <div id="floatingChatMessages" class="floating-chat-messages">
                <div class="floating-chat-message bot">
                    <div class="floating-chat-bubble">
                        Hello! 👋 I'm your Barista AI Assistant. How can I help you today?
                    </div>
                </div>
            </div>
            
            <div class="floating-chat-input-area border-top p-3 bg-white">
                <input type="text" id="floatingChatInput" class="form-control" placeholder="Type your message..." aria-label="Message input">
                <button id="floatingChatSendBtn" class="btn btn-primary ms-2 rounded-circle shadow-sm" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center;">
                    <i class="bi bi-send-fill text-white"></i>
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Get elements
    const chatBtn = document.getElementById('floatingChatBtn');
    const chatWindow = document.getElementById('floatingChatWindow');
    const closeBtn = document.getElementById('floatingChatCloseBtn');
    const sendBtn = document.getElementById('floatingChatSendBtn');
    const inputField = document.getElementById('floatingChatInput');
    const messagesContainer = document.getElementById('floatingChatMessages');

    // Toggle chat window
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            inputField.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    // Handle sending messages
    async function sendFloatingMessage() {
        const text = inputField.value.trim();
        if (!text) return;

        // Add user message to UI
        appendFloatingMessage(text, 'user');
        inputField.value = '';

        // Show typing indicator
        const typingId = showFloatingTypingIndicator();

        try {
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            removeFloatingTypingIndicator(typingId);

            if (response.ok) {
                const data = await response.json();
                appendFloatingMessage(data.message || "I didn't understand that.", 'bot');
            } else {
                appendFloatingMessage("Sorry, I'm having trouble connecting to the server.", 'bot');
            }
        } catch (error) {
            console.error('Chat error:', error);
            removeFloatingTypingIndicator(typingId);
            appendFloatingMessage("Network error. Please try again later.", 'bot');
        }
    }

    sendBtn.addEventListener('click', sendFloatingMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendFloatingMessage();
    });

    // Helper to append messages
    function appendFloatingMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `floating-chat-message ${sender}`;

        // Convert basic markdown formatting to HTML (bold and lists) if it's a bot message
        let formattedText = text;
        if (sender === 'bot') {
            formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>')
                .replace(/\* (.*?)<br>/g, '• $1<br>');
        }

        msgDiv.innerHTML = `<div class="floating-chat-bubble">${formattedText}</div>`;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Helper for typing indicator
    function showFloatingTypingIndicator() {
        const id = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.className = 'floating-chat-message bot';
        typingDiv.id = id;
        typingDiv.innerHTML = `
            <div class="floating-chat-bubble p-2">
                <div class="floating-typing-indicator m-0">
                    <span class="floating-typing-dot"></span>
                    <span class="floating-typing-dot"></span>
                    <span class="floating-typing-dot"></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        return id;
    }

    function removeFloatingTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }
}
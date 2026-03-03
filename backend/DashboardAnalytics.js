export function DashboardAnalytics(supabase,app) {
    //Dashboard analytics route
    app.get('/api/dashboard/stats', async (req, res) => {
        try {
            // Fetch review stats from ML service
            const reviewStatsResponse = await fetch('http://localhost:5000/api/reviews/stats');
            const reviewStats = reviewStatsResponse.ok ? await reviewStatsResponse.json() : { total: 0, positive: 0, neutral: 0, negative: 0 };

            // Fetch branches count
            const { data: branches, error: branchError } = await supabase
                .from('branches')
                .select('id', { count: 'exact' });

            // Fetch users count
            const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

            // Calculate positive sentiment percentage
            const positivePercentage = reviewStats.total > 0
                ? ((reviewStats.positive / reviewStats.total) * 100).toFixed(1)
                : 0;

            const dashboardStats = {
                totalReviews: reviewStats.total,
                positiveSentiment: `${positivePercentage}%`,
                activeBranches: branches ? branches.length : 0,
                registeredUsers: users ? users.length : 0,
                reviewStats: {
                    positive: reviewStats.positive,
                    neutral: reviewStats.neutral,
                    negative: reviewStats.negative
                }
            };

            res.json(dashboardStats);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err.message);
            res.status(500).json({ error: 'Failed to fetch dashboard statistics', details: err.message });
        }
    });
};
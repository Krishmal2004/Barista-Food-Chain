import axios from 'axios';
export function ReviewAnalysis(supabase,app) {
    // Proxy to ML service
    app.get('/api/health', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/health');
            if (!response.ok) {
                return res.status(response.status).json({ error: 'Failed to fetch' });
            }
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.get('/api/reviews', async (req, res) => {
        try {
            const response = await fetch(`http://localhost:5000/api/reviews?limit=${req.query.limit || 100}`);
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/reviews/stats', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/reviews/stats');
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/analyze-review', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/analyze-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/reviews/analyze-all', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/reviews/analyze-all', {
                method: 'POST'
            });
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/reviews/branches', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/reviews/branches');
            const data = await response.json();
            res.json(data);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
};
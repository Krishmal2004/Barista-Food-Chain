export function ChatBot(supabase,app) {
    app.post('/api/chatbot', async (req, res) => {
        try {
            const response = await fetch('http://localhost:5000/api/chatbot', {
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
};
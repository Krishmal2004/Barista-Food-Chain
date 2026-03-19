export function Review(supabase,app) {
    app.post('/api/reviews', async (req, res) => {
        const { branch_id, user_name, user_email, rating, review_text, platform } = req.body;

        // Basic Validation
        if (!branch_id || !rating || !review_text) {
            return res.status(400).json({ error: 'branch_id, rating, and review_text are required.' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
        }

        try {
            // Insert data into Supabase
            const { data, error } = await supabase
                .from('qr_reviews')
                .insert([
                    { 
                        branch_id, 
                        user_name: user_name || null, 
                        user_email: user_email || null, 
                        rating, 
                        review_text, 
                        platform: platform || 'Web' 
                    }
                ])
                .select();

            if (error) {
                console.error('Supabase Insert Error:', error);
                return res.status(500).json({ error: 'Failed to save review to database.' });
            }

            return res.status(201).json({ 
                message: 'Review submitted successfully!', 
                review: data[0] 
            });

        } catch (err) {
            console.error('Server Error:', err);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    });
};
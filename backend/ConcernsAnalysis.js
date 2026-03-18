export function ConcernAnalysis(supabase, app) {
    app.get('/api/concerns', async (req, res) => {
        const { branch_id, status, search } = req.query;
        
        try {
            let query = supabase
                .from('concerns')
                .select('*')
                .order('created_at', { ascending: false });

            if (branch_id) {
                query = query.eq('branch_id', branch_id);
            }

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) {
                console.error("❌ Fetch Concerns Error:", error.message);
                return res.status(400).json({ 
                    error: error.message,
                    details: "Database query failed" 
                });
            }

            let results = data || [];
            if (search) {
                const searchLower = search.toLowerCase();
                results = results.filter(c =>
                    c.title.toLowerCase().includes(searchLower) ||
                    (c.description && c.description.toLowerCase().includes(searchLower))
                );
            }

            console.log(` Retrieved ${results.length} concerns`);
            res.status(200).json(results);
        } catch (err) {
            console.error(" Error fetching concerns:", err);
            res.status(500).json({ error: "Internal server error", details: err.message });
        }
    });

    app.get('/api/concerns/:id', async (req, res) => {
        const { id } = req.params;
        
        try {
            const { data, error } = await supabase
                .from('concerns')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error(" Fetch Concern Error:", error.message);
                return res.status(404).json({ error: "Concern not found" });
            }

            if (!data) {
                return res.status(404).json({ error: "Concern not found" });
            }

            console.log(` Retrieved concern: ${id}`);
            res.status(200).json(data);
        } catch (err) {
            console.error(" Error fetching concern:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.post('/api/concerns', async (req, res) => {
        const { branch_id, title, description, priority, category, status } = req.body;

        // Validation
        if (!branch_id) {
            return res.status(400).json({ error: "branch_id is required" });
        }
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: "title is required and cannot be empty" });
        }

        try {
            console.log(` Creating concern for branch: ${branch_id}`);
            const { data, error } = await supabase
                .from('concerns')
                .insert([{
                    branch_id,
                    title: title.trim(),
                    description: description ? description.trim() : null,
                    priority: priority || 'Medium',
                    category: category || null,
                    status: status || 'Open'
                }])
                .select();

            if (error) {
                console.error(" Create Concern Error:", error.message);
                return res.status(400).json({ 
                    error: error.message,
                    details: "Failed to insert concern" 
                });
            }

            console.log(` Concern created: ${data[0].id}`);
            res.status(201).json(data[0]);
        } catch (err) {
            console.error(" Error creating concern:", err);
            res.status(500).json({ error: "Internal server error", details: err.message });
        }
    });

    app.put('/api/concerns/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, priority, category, status } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title.trim();
        if (description !== undefined) updates.description = description ? description.trim() : null;
        if (priority !== undefined) updates.priority = priority;
        if (category !== undefined) updates.category = category;
        if (status !== undefined) updates.status = status;
        updates.updated_at = new Date().toISOString();

        try {
            console.log(` Updating concern: ${id}`, updates);
            const { data, error } = await supabase
                .from('concerns')
                .update(updates)
                .eq('id', id)
                .select();

            if (error) {
                console.error(" Update Concern Error:", error.message);
                return res.status(400).json({ error: error.message });
            }

            if (!data || data.length === 0) {
                return res.status(404).json({ error: "Concern not found" });
            }

            console.log(` Concern updated: ${id}`);
            res.status(200).json(data[0]);
        } catch (err) {
            console.error(" Error updating concern:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.delete('/api/concerns/:id', async (req, res) => {
        const { id } = req.params;

        try {
            console.log(` Deleting concern: ${id}`);
            const { error } = await supabase
                .from('concerns')
                .delete()
                .eq('id', id);

            if (error) {
                console.error(" Delete Concern Error:", error.message);
                return res.status(400).json({ error: error.message });
            }

            console.log(` Concern deleted: ${id}`);
            res.status(200).json({ message: "Concern deleted successfully" });
        } catch (err) {
            console.error(" Error deleting concern:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.get('/api/concerns/stats/summary', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('concerns')
                .select('status');

            if (error) {
                console.error(" Stats Error:", error.message);
                throw error;
            }

            const stats = {
                total: data?.length || 0,
                open: data?.filter(c => c.status === 'Open').length || 0,
                inProgress: data?.filter(c => c.status === 'In Progress').length || 0,
                closed: data?.filter(c => c.status === 'Closed').length || 0
            };

            console.log(` Stats retrieved:`, stats);
            res.status(200).json(stats);
        } catch (err) {
            console.error(" Error fetching stats:", err);
            res.status(500).json({ error: "Internal server error" });
        }
    });
}
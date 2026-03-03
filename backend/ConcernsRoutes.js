export function ConcernsRoutes(supabase,app) {
    //concerns routes
    app.get('/api/concerns/:branchId', async (req, res) => {
        const { branchId } = req.params;
        try {
            const { data, error } = await supabase
                .from('concerns')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });
            if (error) {
                console.error("Supabase fetch concerns error: ", error.message);
                return res.status(400).json({ error: error.message });
            }
            res.status(200).json(data);
        } catch (err) {
            console.error("Server error : ", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    })
    // Add new concerns
    app.post('/api/concerns', async (req, res) => {
        const { branch_id, title, description, priority, category, status } = req.body;
        try {
            const { data, error } = await supabase
                .from('concerns')
                .insert([{
                    branch_id, title, description, priority, category, status
                }])
                .select()
                .single();
            if (error) {
                console.error("Supabase add concern error: ", error.message);
                return res.status(400).json({ error: error.message });
            }
            console.log(`Concern "${title}" added successfully for branch ${branch_id}`);
            res.status(201).json({ message: "Concern added successfully", data });
        } catch (err) {
            console.error("Server error: ", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // Update concerns
    app.put('/api/concerns/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, priority, category, status } = req.body;

        try {
            const { data, error } = await supabase
                .from('concerns')
                .update({
                    title,
                    description,
                    priority,
                    category,
                    status,
                })
                .eq('id', id)
                .select()
                .single();

            if (error) {
                console.error("Supabase Update Concern Error:", error.message);
                return res.status(400).json({ error: error.message });
            }

            res.status(200).json({ message: "Concern updated successfully", data });
        } catch (err) {
            console.error("Server Error:", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // Delete concerns
    app.delete('/api/concerns/:id', async (req, res) => {
        const { id } = req.params;

        try {
            const { error } = await supabase
                .from('concerns')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Supabase Delete Concern Error:", error.message);
                return res.status(400).json({ error: error.message });
            }

            res.status(200).json({ message: "Concern deleted successfully" });
        } catch (err) {
            console.error("Server Error:", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
};
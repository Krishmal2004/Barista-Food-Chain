export function BranchReportingDataRouting(supabase,app) {
    // Branch Report data routing
    app.get(`/api/report/:branchId`, async (req, res) => {
        const { branchId } = req.params;
        try {
            const { data: branchData, error: branchError } = await supabase
                .from('branches')
                .select('*')
                .eq('branch_id', branchId)
                .single();
            if (branchError) throw branchError;
            const { data: todos, error: todosError } = await supabase
                .from('todos')
                .select('*')
                .eq('branch_id', branchId);
            if (todosError) throw todosError;
            const { data: concerns, error: concernsError } = await supabase
                .from('concerns')
                .select('*')
                .eq('branch_id', branchId);
            if (concernsError) throw concernsError;
            res.status(200).json({
                branch: branchData,
                todos: todos || [],
                concerns: concerns || []
            });
        } catch (err) {
            console.error("Server Error:", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    // ===== Custom Reports Routes =====
    app.get('/api/custom-reports', async (req, res) => {
        try {
            const { data, error } = await supabase.from('custom_reports').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            res.status(200).json(data);
        } catch (err) {
            console.error("Fetch custom reports error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/custom-reports', async (req, res) => {
        const { id, title, widgets } = req.body;
        try {
            const { data, error } = await supabase.from('custom_reports').insert([{
                id: id || 'report_' + Date.now().toString(),
                title,
                widgets
            }]).select();
            if (error) throw error;
            res.status(201).json(data[0]);
        } catch (err) {
            console.error("Create custom report error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/custom-reports/:id', async (req, res) => {
        const { id } = req.params;
        const { title, widgets } = req.body;
        try {
            const { data, error } = await supabase.from('custom_reports').update({
                title,
                widgets,
                updated_at: new Date().toISOString()
            }).eq('id', id).select();
            if (error) throw error;
            res.status(200).json(data[0]);
        } catch (err) {
            console.error("Update custom report error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });

    app.delete('/api/custom-reports/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const { error } = await supabase.from('custom_reports').delete().eq('id', id);
            if (error) throw error;
            res.status(200).json({ message: "Deleted successfully" });
        } catch (err) {
            console.error("Delete custom report error:", err.message);
            res.status(500).json({ error: err.message });
        }
    });
};
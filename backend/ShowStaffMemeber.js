export function ShowStaffMemberRoutes(supabase,app) {
    app.get('/api/staff/:branchId', async (req, res) => {
        const { branchId } = req.params;
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('branch_id', branchId)
                .order('full_name', { ascending: true });

            if (error) {
                console.error("Fetch Staff Error:", error.message);
                return res.status(400).json({ error: error.message });
            }
            res.status(200).json(data);
        } catch (err) {
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.delete('/api/staff/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const { error } = await supabase
                .from('staff')
                .delete()
                .eq('id', id);

            if (error) {
                console.error("Delete Staff Error:", error.message);
                return res.status(400).json({ error: error.message });
            }
            res.status(200).json({ message: "Staff member deleted successfully" });
        } catch (err) {
            res.status(500).json({ error: "Internal server error" });
        }
    });

    app.post('/api/staff', async (req, res) => {
        const { branch_id, full_name,member_id, role, email, phone, hire_date, status } = req.body;
        try {
            const { data, error } = await supabase
                .from('staff')
                .insert([{ 
                    branch_id, 
                    full_name, 
                    member_id,
                    role, 
                    email, 
                    phone, 
                    hire_date, 
                    status 
                }])
                .select();

            if (error) return res.status(400).json({ error: error.message });
            res.status(201).json(data[0]);
        } catch (err) {
            res.status(500).json({ error: "Internal server error" });
        }
    });
};
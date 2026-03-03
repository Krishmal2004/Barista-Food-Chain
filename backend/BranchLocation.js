export function BranchLocationRoute(supabase,app) {
    // Update branch location
    app.put('/api/branches/location/:branchId', async (req, res) => {
        const { branchId } = req.params;
        const { latitude, longitude } = req.body;

        if (latitude === undefined || longitude === undefined) {
            return res.status(400).json({ error: "Latitude and longitude are required" });
        }

        try {
            const { data, error } = await supabase
                .from('branches')
                .update({
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude)
                })
                .eq('branch_id', branchId)
                .select()
                .single();

            if (error) {
                console.error("Supabase Location Update Error:", error.message);
                return res.status(400).json({ error: error.message });
            }

            console.log(`Branch ${branchId} location updated to [${latitude}, ${longitude}]`);
            res.status(200).json({ message: "Location updated successfully", data });
        } catch (err) {
            console.error("Server Error:", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
    app.get('/api/branch/:branchId', async (req, res) => {
        const { branchId } = req.params;
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .eq('branch_id', branchId)
                .single();
            if (error || !data) {
                console.error("Supabase Fetch Branch Error: ", error ? error.message : "Branch not found");
                return res.status(404).json({ error: error ? error.message : "Branch not found" });
            }
            console.log(`Branch ${branchId} profile fetched successfully`);
            res.status(200).json({ message: "Branch profile fetched successfully", data });
        } catch (err) {
            console.error("Server Error: ", err.message);
            res.status(500).json({ error: "Internal server error" });
        }
    });
};
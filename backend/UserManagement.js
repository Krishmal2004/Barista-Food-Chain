export function UserManagementRoute(supabase,app) {
    // ===== User Management Routes =====
    // get the all users
    app.get('/api/users', async (req, res) => {
        try {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) {
                console.error("List users Error: ", error.message);
                return res.status(400).json({ error: error.message });
            }
            console.log("Successfully fetched users list");
            res.status(200).json(users);
        } catch (err) {
            console.error("List users Server Error: ", err.message);
            res.status(400).json({ error: err.message });
        }
    });
    // Get the stats
    app.get('/api/users/stats', async (req, res) => {
        try {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) {
                console.error("List users error:", error.message);
                return res.status(400).json({ error: error.message });
            }
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const stats = {
                totalUsers: users.length,
                activeUsers: users.filter(u => u.last_sign_in_at).length,
                newThisMonth: users.filter(u => new Date(u.created_at) >= firstOfMonth).length,
                pendingUsers: users.filter(u => !u.email_confirmed_at).length
            };
            console.log('Stats fetched:', stats);
            res.status(200).json(stats);
        } catch (err) {
            console.error("Stats Error:", err.message);
            res.status(400).json({ error: err.message });
        }
    });
    //Get the single user details
    app.get('/api/users/:id', async (req, res) => {
        try {
            const { data: { user }, error } = await supabase.auth.admin.getUserById(req.params.id);
            if (error) {
                console.error("Get user error:", error.message);
                return res.status(400).json({ error: error.message });
            }
            console.log(`User ${req.params.id} fetched successfully`);
            res.status(200).json(user);
        } catch (error) {
            console.error("Get user error:", error.message);
            res.status(400).json({ error: error.message });
        }
    });
    //Update the user profile (Admin Panel)
    app.put('/api/users/:id', async (req, res) => {
        const { id } = req.params;
        const { fullName, email, phone } = req.body;
        try {
            const { data, error } = await supabase.auth.admin.updateUserById(id, {
                email: email,
                user_metadata: {
                    full_name: fullName,
                    phone: phone
                }
            });
            if (error) {
                console.error("Update user error:", error.message);
                return res.status(400).json({ error: error.message });
            }
        } catch (error) {
            console.error("Update user error:", error.message);
            res.status(400).json({ error: error.message });
        }
    });
    // Delete Users (admin Panel)
    app.delete('/api/users/:id', async (req, res) => {
        try {
            const { error } = await supabase.auth.admin.deleteUser(req.params.id);
            if (error) {
                console.error("Delete user error:", error.message);
                return res.status(400).json({ error: error.message });
            }
            console.log(`User ${req.params.id} deleted successfully`);
            res.status(200).json({ message: "User deleted successfully" });
        } catch (error) {
            console.error("Delete User Error:", error.message);
            res.status(400).json({ error: error.message });
        }
    });
};
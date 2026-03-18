export function signin(supabase, app) {
    app.post('/api/signin', async (req, res) => {
        const { member_id, email } = req.body;
        if (!member_id || !email) {
            return res.status(400).json({ error: "Member ID and Email are required" });
        }
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('member_id', member_id)
                .eq('email', email)
                .single();
            if (error || !data) {
                console.error("Staff Member Login Error: " + (error ? error.message : "Invalid credentials"));
                return res.status(401).json({ error: "Invalid Staff ID or Email" });
            }
            console.log(`Staff member ${member_id} (${email}) successfully logged in`);
            res.status(200).json({
                message: "Staff member successfully logged in",
                data: {
                    id: data.id,
                    member_id: data.member_id,
                    name: data.name,
                    contact_email: data.contact_email,
                    role: data.role,
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error" });
        }
    });
}
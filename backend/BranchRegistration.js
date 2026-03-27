export function BranchRegistrationRoute(supabase,app) {
    // Branch registration routing 
    app.post('/api/register-branch', async (req, res) => {
        const branchData = req.body;

        const { data: existingBranch, error: checkError } = await supabase
            .from('branches')
            .select('branch_name')
            .ilike('branch_name', branchData.branchName) 
            .maybeSingle();

        if (existingBranch) {
            return res.status(400).json({ error: `A branch named "${branchData.branchName}" is already registered.` });
        }

        const { data, error } = await supabase.from('branches').insert([{
            branch_name: branchData.branchName,
            branch_id: branchData.branchId,
            branch_password: branchData.branchPassword,
        }]);

        if (error) {
            console.error("Supabase Branch Registration Error: ", error.message);
            if (error.code === '23505') {
                return res.status(400).json({ error: "This Branch Name or ID is already in use." });
            }
            return res.status(400).json({ error: error.message });
        }
        
        res.status(200).json({ message: "Branch successfully registered", data });
    });

    // Branch login routing 
    app.post('/api/login-branch', async (req, res) => {
        const { branchId, branchPassword } = req.body;
        const { data, error } = await supabase.from('branches').select('*').eq('branch_id', branchId).eq('branch_password', branchPassword).single();
        if (error || !data) {
            console.error("Supabase Branch Login Error: ", error ? error.message : "Invalid credentials");
            return res.status(401).json({ error: "Invalid credentials" });
        }
        console.log(`Branch ${branchId} successfully logged in`);
        res.status(200).json({ message: "Branch successfully logged in", data });
    });

    //Branch profile updating route
    app.put('/api/update-branch/:branchId', async (req, res) => {
        const { branchId } = req.params;
        const { name, manager, email, phone } = req.body;

        if (!name) {
            return res.status(400).json({ error: "Branch name is required" });
        }

        const { data, error } = await supabase
            .from('branches')
            .update({
                branch_name: name,
                contact_full_name: manager,
                contact_email: email,
                contact_phone: phone,
            })
            .eq('branch_id', branchId)
            .select();

        if (error) {
            console.error("Supabase Update Error:", error.message);
            return res.status(400).json({ error: error.message });
        }
        res.status(200).json({ message: "Branch profile successfully updated", data });
    });
};
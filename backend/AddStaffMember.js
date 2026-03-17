export function AddStaffMemberRoutes(supabase,app) {
    app.get('/api/members/:branchId', async (req, res) => {
        const {branchId} = req.params;
        try {
            const {data,error}= await supabase
                .from('staff')
                .select('*')
                .eq('branch_id',branchId)
                .order('full_name',{ascending:true});
            if(error) {
                console.error("Supabase fetch adding members error: ",error.message);
                return res.status(400).json({error:error.message});
            }
            res.status(200).json(data);
        } catch(err) {
            console.error("Server error :",err.message);
            res.status(500).json({error:"Internal server error"});
        }
    });

    app.post('/api/staff', async (req, res) => {
        const { branch_id, full_name,member_id, role, email, phone, hire_date, status } = req.body;
        
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
    });
};
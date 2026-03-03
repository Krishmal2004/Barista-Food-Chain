export function UserSignUp (supabase,app) {
        app.post('/api/signup', async (req, res) => {
        const { email, password, fullName, username, phone } = req.body;
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    username: username,
                    phone: phone
                }
            }
        });
        if (error) {
            console.error("Supabase Error: ", error.message);
            return res.status(400).json({ error: error.message });
        }
        console.log("User successfully created in supabase auth");
        res.status(200).json({ message: "Successfully signed up", data });
    });
    // User login routing
    app.post('/api/login', async (req, res) => {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) {
            console.error("Supabase Loging Error: ", error.message);
            return res.status(400).json({ error: error.message });
        }
        console.log("User successfully logged in");
        res.status(200).json({ message: "Successfully logged in", data });
    });
};
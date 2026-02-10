import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// __ dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
// Supabase client setup
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
// User signup routing
app.post('/api/signup', async (req, res) => {
    const {email, password, fullName, username, phone} = req.body;
    const {data, error} = await supabase.auth.signUp({
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
        return res.status(400).json({error: error.message});
    }
    console.log("User successfully created in supabase auth");
    res.status(200).json({message: "Successfully signed up", data});
});
// User login routing
app.post('/api/login', async (req, res) => {
    const {email,password} = req.body;
    const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) {
        console.error("Supabase Loging Error: ", error.message);
        return res.status(400).json({error: error.message});
    }
    console.log("User successfully logged in");
    res.status(200).json({message: "Successfully logged in", data});
});

// Branch registration routing 
app.post('/api/register-branch', async (req, res) => {
    const branchData  = req.body;
    const {data, error} = await supabase.from('branches').insert([{
        business_name: branchData.businessName,
        branch_name: branchData.branchName,
        branch_id: branchData.branchId,
        business_type: branchData.businessType,
        year_established: branchData.yearEstablished,
        contact_full_name: branchData.fullName,
        contact_position: branchData.position,
        contact_email: branchData.email,
        contact_phone: branchData.phone,
        address: branchData.address,
        city: branchData.city,
        state: branchData.state,
        zip_code: branchData.zipCode,
        country: branchData.country,
        review_platforms: branchData.platforms, // Array of strings
        additional_info: branchData.additionalInfo,
        newsletter_subscribed: branchData.newsletter
    }]);
    if (error) {
        console.error("Supabase Branch Registration Error: ",error.message);
        return res.status(400).json({error: error.message});
    }
    res.status(200).json({message: "Branch successfully registered", data});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend runnning on http://localhost:${PORT}`);
});
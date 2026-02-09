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

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend runnning on http://localhost:${PORT}`);
});
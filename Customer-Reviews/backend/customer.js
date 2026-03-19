import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Review } from './review.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
app.use(express.json());    
app.use(cors());

app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'review.html'));
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
if(!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in your .env file for proper functionality.');
}
Review(supabase, app);
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Backend running on http://localhost:${PORT}`);
});
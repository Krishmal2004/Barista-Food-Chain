import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as todoLogic from './todo.js';
import * as mapLogic from './map.js';
import { title } from 'process';
import {UserSignUp} from './UserSignup.js';
import {BranchRegistrationRoute} from './BranchRegistration.js';
import {BranchLocationRoute} from './BranchLocation.js';
import {TodoRoutes} from './TodoRoutes.js';
import {ConcernsRoutes} from './ConcernsRoutes.js';
import {BranchReportingDataRouting} from './BranchReportingDataRouting.js';
import {UserManagementRoute} from './UserManagement.js';
import {MapData} from './MapData.js';
import {ReviewAnalysis} from './ReviewAnalysis.js';
import {ChatBot} from './ChatBot.js';
import {DashboardAnalytics} from './DashboardAnalytics.js';
import { AddStaffMemberRoutes } from './AddStaffMember.js';
import { ShowStaffMemberRoutes } from './ShowStaffMemeber.js';
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
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in your .env file for proper functionality.');
}
UserSignUp(supabase,app);
BranchRegistrationRoute(supabase,app);
BranchLocationRoute(supabase,app);
TodoRoutes(supabase,app);
ConcernsRoutes(supabase,app);
BranchReportingDataRouting(supabase,app);
UserManagementRoute(supabase,app);
MapData(supabase,app);
ReviewAnalysis(supabase,app);
ChatBot(supabase,app);
DashboardAnalytics(supabase,app);
AddStaffMemberRoutes(supabase,app);
ShowStaffMemberRoutes(supabase,app);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend runnning on http://localhost:${PORT}`);
});
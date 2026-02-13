import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as todoLogic from './todo.js';
import { title } from 'process';
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
        branch_password: branchData.branchPassword,
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
// Branch login routing 
app.post('/api/login-branch',async (req,res)=> {
    const {branchId,branchPassword} = req.body;
    const {data,error} = await supabase.from('branches').select('*').eq('branch_id',branchId).eq('branch_password',branchPassword).single();
    if (error || !data) {
        console.error("Supabase Branch Login Error: ",error ? error.message: "Invalid credentials");
        return res.status(401).json({error:"Invalid credentials"});
    }
    console.log(`Branch ${branchId} successfully logged in`);
    res.status(200).json({message: "Branch successfully logged in", data});
});
//Branch profile updating route
app.put('/api/update-branch/:branchId', async (req,res) => {
    const {branchId} = req.params;
    const {name, manager, email, phone, address} = req.body;

    if(!name) {
        return res.status(400).json({error:"Branch name is required"});
    }

    const { data, error} =  await supabase
        .from('branches')
        .update({
            branch_name: name,
            contact_full_name: manager,
            contact_email: email,
            contact_phone: phone,
            address: address,
        })
        .eq('branch_id', branchId)
        .select();

    if (error) {
        console.error("Supabase Update Error:",error.message);
        return res.status(400).json({error: error.message});
    }
    res.status(200).json({message: "Branch profile successfully updated", data});
});
app.get('/api/branch/:branchId', async (req,res) => {
    const {branchId} = req.params;
    try {
        const {data,error}= await supabase
            .from('branches')
            .select('*')
            .eq('branch_id', branchId)
            .single();
        if (error || !data) {
            console.error("Supabase Fetch Branch Error: ",error ? error.message : "Branch not found");
            return res.status(404).json({error: error ? error.message : "Branch not found"});
        }
        console.log(`Branch ${branchId} profile fetched successfully`);
        res.status(200).json({message: "Branch profile fetched successfully", data});
    } catch (err) {
        console.error("Server Error: ",err.message);
        res.status(500).json({error: "Internal server error"});
    }
});

// Todo routes
app.get('/api/todos/:branchId',async (req, res) => {
    try {
        const data = await todoLogic.getTodosByBranch(supabase, req.params.branchId);
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});
// todo create new 
app.post('/api/todos',async (req,res) => {
    try {
        const data = await todoLogic.addTodo(supabase,req.body);
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
})
// todo status update
app.patch('/api/todos/:id',async (req,res)=>{
    try {
        const data = await todoLogic.toggleTodoStatus(supabase, req.params.id,req.body.completed);
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});
// todo task delete 
app.delete('/api/todos/:id', async (req,res) =>{
    try {
        await todoLogic.deleteTodo(supabase,req.params.id);
        res.status(200).json({message: "Todo successfully deleted"});
    } catch (error) {
        res.status(400).json({error: error.message});
    }
});

//concerns routes
app.get('/api/concerns/:branchId', async (req,res) => {
    const {branchId} = req.params;
    try {
        const {data,error} = await supabase
            .from('concerns')
            .select('*')
            .eq('branch_id', branchId)
            .order('created_at', {ascending: false});
        if(error) {
            console.error("Supabase fetch concerns error: ",error.message);
            return res.status(400).json({error: error.message});
        }
        res.status(200).json(data);
    } catch (err) {
        console.error("Server error : ",err.message);
        res.status(500).json({error: "Internal server error"});
    }
})
// Add new concerns
app.post('/api/concerns', async (req,res) => {
    const {branch_id,title, description, priority, category, status} = req.body;
    try {
        const {data,error} =  await supabase
            .from('concerns')
            .insert([{
                branch_id,title,description,priority,category,status
            }])
            .select()
            .single();
        if(error) {
            console.error("Supabase add concern error: ",error.message);
            return res.status(400).json({error: error.message});
        }
        console.log(`Concern "${title}" added successfully for branch ${branch_id}`);
        res.status(201).json({message: "Concern added successfully", data});
    } catch (err) {
        console.error("Server error: ",err.message);
        res.status(500).json({error: "Internal server error"});
    }
});
// Update concerns
app.put('/api/concerns/:id', async (req, res) => {
    const {id} = req.params;
    const {title, description, priority, category, status} = req.body;

    try {
        const {data, error} = await supabase 
            .from('concerns')
            .update({
                title,
                description,
                priority,
                category,
                status,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Supabase Update Concern Error:", error.message);
            return res.status(400).json({error: error.message});
        }
        
        res.status(200).json({message: "Concern updated successfully", data});
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({error: "Internal server error"});
    }
});

// Delete concerns
app.delete('/api/concerns/:id', async (req, res) => {
    const {id} = req.params;
    
    try {
        const {error} = await supabase 
            .from('concerns')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error("Supabase Delete Concern Error:", error.message);
            return res.status(400).json({error: error.message});
        }
        
        res.status(200).json({message: "Concern deleted successfully"});
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({error: "Internal server error"});
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend runnning on http://localhost:${PORT}`);
});
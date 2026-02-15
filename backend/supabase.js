import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as todoLogic from './todo.js';
import * as mapLogic from './map.js';
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
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
if(!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Please set it in your .env file for proper functionality.');
}
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

// Update branch location
app.put('/api/branches/location/:branchId', async (req, res) => {
    const { branchId } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    try {
        const { data, error } = await supabase
            .from('branches')
            .update({
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
            })
            .eq('branch_id', branchId)
            .select()
            .single();

        if (error) {
            console.error("Supabase Location Update Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        console.log(`Branch ${branchId} location updated to [${latitude}, ${longitude}]`);
        res.status(200).json({ message: "Location updated successfully", data });
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
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
// Branch Report data routing
app.get(`/api/report/:branchId`, async (req,res) => {
    const {branchId} = req.params;
    try {
        const {data: branchData, error: branchError} = await supabase
            .from('branches')
            .select('*')
            .eq('branch_id', branchId)
            .single();
        if(branchError) throw branchError;
        const {data: todos,error: todosError} = await supabase 
            .from('todos')
            .select('*')
            .eq('branch_id',branchId);
        if(todosError) throw todosError;
        const {data: concerns, error: concernsError} = await supabase
            .from('concerns')
            .select('*')
            .eq('branch_id', branchId);
        if(concernsError) throw concernsError;
        res.status(200).json({
            branch: branchData,
            todos: todos || [],
            concerns: concerns || []
        });
    } catch (err) {
        console.error("Server Error:",err.message);
        res.status(500).json({error: "Internal server error"});
    }
});
// ===== User Management Routes =====
// get the all users
app.get('/api/users', async (req,res) => {
    try {
        const {data:{users},error} = await supabase.auth.admin.listUsers();
        if(error) {
            console.error("List users Error: ", error.message);
            return res.status(400).json({error: error.message});
        }
        console.log("Successfully fetched users list");
        res.status(200).json(users);
    } catch (err) {
        console.error("List users Server Error: ", err.message);
        res.status(400).json({error: err.message});
    }
});
// Get the stats
app.get('/api/users/stats', async (req,res) => {
    try {
        const {data:{users},error} =  await supabase.auth.admin.listUsers();
        if(error) {
            console.error("List users error:",error.message);
            return res.status(400).json({error:error.message});
        }
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const stats = {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.last_sign_in_at).length,
            newThisMonth: users.filter(u => new Date(u.created_at) >= firstOfMonth).length,
            pendingUsers: users.filter(u => !u.email_confirmed_at).length
        };
        console.log('Stats fetched:',stats);
        res.status(200).json(stats);
    } catch (err) {
        console.error("Stats Error:",err.message);
        res.status(400).json({error:err.message});
    }
});
//Get the single user details
app.get('/api/users/:id', async (req,res) => {
    try {
        const {data:{user},error} = await supabase.auth.admin.getUserById(req.params.id);
        if(error) {
            console.error("Get user error:",error.message);
            return res.status(400).json({error:error.message});
        }
        console.log(`User ${req.params.id} fetched successfully`);
        res.status(200).json(user);
    } catch (error) {
        console.error("Get user error:",error.message);
        res.status(400).json({error:error.message});
    }
});
//Update the user profile (Admin Panel)
app.put('/api/users/:id', async (req,res) => {
    const {id} =  req.params;
    const {fullName,email,phone} = req.body;
    try {
        const {data,error} = await supabase.auth.admin.updateUserById(id, {
            email: email,
            user_metadata: {
                full_name: fullName,
                phone: phone
            }
        });
        if (error) {
            console.error("Update user error:",error.message);
            return res.status(400).json({error:error.message});
        }
    } catch (error) {
        console.error("Update user error:",error.message);
        res.status(400).json({error:error.message});
    }
});
// Delete Users (admin Panel)
app.delete('/api/users/:id', async (req,res) => {
    try {
        const {error} = await supabase.auth.admin.deleteUser(req.params.id);
        if(error) {
            console.error("Delete user error:",error.message);
            return res.status(400).json({error:error.message});
        }
        console.log(`User ${req.params.id} deleted successfully`);
        res.status(200).json({message:"User deleted successfully"});
    } catch (error) {
        console.error("Delete User Error:",error.message);
        res.status(400).json({error:error.message});
    }
});
//Map Data
app.get('/api/branches/map', async (req,res) => {
    try {
        const locations = await mapLogic.getBranchLocations(supabase);
        res.status(200).json(locations);
    } catch (error) {
        res.status(400).json({error:"Failed to fetch the branch locations"});
    }
});

import axios from 'axios';

// ML Service URL
const ML_SERVICE_URL = 'http://localhost:5000';

console.log(`🔗 ML Service URL configured: ${ML_SERVICE_URL}`);

// ==================== REVIEWS & SENTIMENT ROUTES ====================

// Get all reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const { business_name, sentiment, limit = 100 } = req.query;

        let query = supabase
            .from('reviews')
            .select('*')
            .order('review_date', { ascending: false })
            .limit(parseInt(limit));

        if (business_name) query = query.eq('business_name', business_name);
        if (sentiment) query = query.eq('sentiment_score', sentiment);

        const { data, error } = await query;

        if (error) {
            console.error("Fetch Reviews Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        console.log(`✅ Fetched ${data.length} reviews`);
        res.status(200).json(data);
    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get review statistics
app.get('/api/reviews/stats', async (req, res) => {
    try {
        const { business_name } = req.query;

        let query = supabase.from('reviews').select('*');
        if (business_name) query = query.eq('business_name', business_name);

        const { data, error } = await query;

        if (error) {
            console.error("Stats Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        const stats = {
            total: data.length,
            positive: data.filter(r => r.sentiment_score === 'positive' || r.sentiment_score === 'Positive').length,
            neutral: data.filter(r => r.sentiment_score === 'neutral' || r.sentiment_score === 'Neutral').length,
            negative: data.filter(r => r.sentiment_score === 'negative' || r.sentiment_score === 'Negative').length,
            avgRating: data.length > 0 
                ? (data.reduce((sum, r) => sum + (r.review_rating || 0), 0) / data.length).toFixed(2)
                : 0
        };

        console.log(`📊 Stats:`, stats);
        res.status(200).json(stats);
    } catch (err) {
        console.error("Stats Error:", err.message);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Analyze review with sentiment
app.post('/api/analyze-review', async (req, res) => {
    const { 
        businessName,
        businessCategory,
        address,
        city,
        reviewerName, 
        reviewRating, 
        reviewText,
        mealType,
        pricePerPerson
    } = req.body;

    console.log('📝 Received review data:', {
        businessName,
        city,
        reviewRating,
        reviewTextLength: reviewText?.length
    });

    if (!reviewText || !businessName || !city || !reviewRating) {
        console.error('❌ Missing required fields');
        return res.status(400).json({ 
            error: "Business name, city, rating, and review text are required" 
        });
    }

    try {
        // 1. Send text to Python sentiment service
        console.log(`🔮 Analyzing review for ${businessName}...`);
        console.log(`📡 Calling ML service at: ${ML_SERVICE_URL}/predict`);
        
        const aiResponse = await axios.post(`${ML_SERVICE_URL}/predict`, {
            text: reviewText
        }, {
            timeout: 10000,
            headers: { 'Content-Type': 'application/json' }
        });

        const { sentiment, confidence, prediction } = aiResponse.data;
        console.log(`✅ ML Service Response:`, { sentiment, confidence, prediction });

        // 2. Save to Supabase
        const now = new Date();
        const reviewData = {
            business_name: businessName,
            business_category: businessCategory || 'Coffee Shop',
            address: address || '',
            city: city,
            reviewer_name: reviewerName || 'Anonymous',
            review_rating: parseInt(reviewRating),
            review_text: reviewText,
            clean_review_text: reviewText,
            review_date: now.toISOString(),
            meal_type: mealType || null,
            price_per_person: pricePerPerson || null,
            sentiment_score: sentiment,
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
            hour: now.getHours()
        };

        console.log('💾 Inserting review into database:', reviewData);

        const { data, error } = await supabase
            .from('reviews')
            .insert([reviewData])
            .select()
            .single();

        if (error) {
            console.error("❌ Supabase Insert Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        console.log(`✅ Review saved with ID: ${data.id}`);

        res.status(200).json({ 
            message: "Review analyzed and saved successfully", 
            sentiment,
            confidence,
            data
        });

    } catch (err) {
        console.error("❌ Error in analyze-review:", err.message);
        console.error("Full error:", err);
        
        if (err.code === 'ECONNREFUSED') {
            return res.status(503).json({ 
                error: "ML service is not running. Please start Python service on port 5000" 
            });
        }

        if (err.response) {
            console.error("ML Service Error Response:", err.response.data);
            return res.status(500).json({ 
                error: "ML service error",
                details: err.response.data 
            });
        }
        
        res.status(500).json({ 
            error: "Failed to process sentiment",
            details: err.message 
        });
    }
});

// Batch analyze existing reviews without sentiment
app.post('/api/reviews/analyze-all', async (req, res) => {
    try {
        console.log('📊 Starting batch analysis...');

        // Get reviews without sentiment
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('*')
            .is('sentiment_score', null);

        if (error) {
            console.error("❌ Fetch error:", error.message);
            throw error;
        }

        if (reviews.length === 0) {
            console.log('ℹ️  No reviews need analysis');
            return res.status(200).json({ 
                message: "No reviews need analysis",
                count: 0
            });
        }

        console.log(`📊 Found ${reviews.length} reviews to analyze`);

        // Prepare batch
        const reviewsForML = reviews.map(r => ({
            id: r.id,
            text: r.review_text
        }));

        // Call ML service
        console.log(`🔮 Sending ${reviewsForML.length} reviews to ML service...`);
        const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict_batch`, {
            reviews: reviewsForML
        }, {
            timeout: 30000
        });

        const results = mlResponse.data.results;
        console.log(`✅ Received ${results.length} predictions`);

        // Update database
        let updated = 0;
        for (const result of results) {
            const { error: updateError } = await supabase
                .from('reviews')
                .update({
                    sentiment_score: result.sentiment,
                    clean_review_text: reviews.find(r => r.id === result.id)?.review_text
                })
                .eq('id', result.id);

            if (!updateError) {
                updated++;
                console.log(`✅ Updated review ${result.id}: ${result.sentiment}`);
            } else {
                console.error(`❌ Failed to update ${result.id}:`, updateError.message);
            }
        }

        console.log(`✅ Batch complete: ${updated}/${reviews.length} reviews updated`);

        res.status(200).json({ 
            message: `Analyzed ${updated} reviews successfully`,
            total: reviews.length,
            updated
        });
    } catch (err) {
        console.error("❌ Batch Analyze Error:", err.message);
        console.error("Full error:", err);
        res.status(500).json({ 
            error: err.message,
            details: err.response?.data || 'No additional details'
        });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend runnning on http://localhost:${PORT}`);
});
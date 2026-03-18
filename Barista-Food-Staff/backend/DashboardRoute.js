export function DashboardRoutes(supabase, app) {
    app.get('/api/dashboard/profile/:memberId', async (req, res) => {
        try {
            const { memberId } = req.params;
            if (!memberId) {
                return res.status(400).json({ error: "Member ID is required" });
            }
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('member_id', memberId)
                .single();

            if (error || !data) {
                console.error("Profile fetch error:", error?.message);
                return res.status(404).json({ error: "Staff member not found" });
            }
            res.status(200).json({
                message: "Profile retrieved successfully",
                profile: {
                    id: data.id,
                    member_id: data.member_id,
                    name: data.name || 'Staff Member',
                    email: data.email,
                    phone: data.phone || '+60 12-345 6789',
                    role: data.role || 'barista',
                    branch: data.branch_id || 'KL Central',
                    shift_start: data.shift_start || '07:00 AM',
                    shift_end: data.shift_end || '03:00 PM',
                    joined_date: data.hire_date || new Date().toISOString(),
                    avatar_initials: (data.name || 'A').split(' ').map(n => n[0]).join('').toUpperCase()
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });

    app.get('/api/dashboard/tasks/:memberId', async (req, res) => {
        try {
            const { memberId } = req.params;
            const { filter } = req.query; 
            if (!memberId) {
                return res.status(400).json({ error: "Member ID is required" });
            }
            let query = supabase
                .from('todos')
                .select('*')
                .eq('assigned_staff_id', memberId)
                .order('created_at', { ascending: false });
            
            // Fix: Use booleans instead of strings
            if (filter === 'pending') {
                query = query.eq('completed', false);
            } else if (filter === 'completed') {
                query = query.eq('completed', true);
            } else if (filter === 'high') {
                query = query.eq('priority', 'high');
            } else if (filter === 'medium') {
                query = query.eq('priority', 'medium');
            } else if (filter === 'low') {
                query = query.eq('priority', 'low');
            }
            
            const { data, error } = await query;
            if (error) {
                console.error("Tasks fetch error:", error.message);
                return res.status(500).json({ error: "Failed to fetch tasks" });
            }
            
            const formattedTasks = (data || []).map(task => ({
                id: task.id,
                text: task.title,
                description: task.task_description,
                done: task.completed === true, // Fix: strict boolean check
                priority: task.priority || 'low',
                added: new Date(task.created_at).toLocaleTimeString('en-MY', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }),
                due_date: task.due_date,
                assigned_by: task.assigned_by,
                notes: task.notes
            }));
            
            const total = formattedTasks.length;
            const completed = formattedTasks.filter(t => t.done).length;
            const pending = total - completed;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
            
            res.status(200).json({
                message: "Tasks retrieved successfully",
                tasks: formattedTasks,
                stats: {
                    total,
                    completed,
                    pending,
                    progress_percentage: progress
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });

    app.put('/api/dashboard/tasks/:taskId', async (req, res) => {
        try {
            const { taskId } = req.params;
            const { status, notes } = req.body; 
            
            if (!taskId || !status) {
                return res.status(400).json({ error: "Task ID and status are required" });
            }
            if (!['completed', 'pending'].includes(status)) {
                return res.status(400).json({ error: "Invalid status. Use 'completed' or 'pending'" });
            }

            // Fix: Convert string status to boolean
            const isCompleted = status === 'completed';

            const { data, error } = await supabase
                .from('todos')
                .update({
                    completed: isCompleted, // Now a boolean
                    notes: notes || null,
                    completed_at: isCompleted ? new Date().toISOString() : null
                })
                .eq('id', taskId)
                .select()
                .single();

            if (error || !data) {
                console.error("Task update error:", error?.message);
                return res.status(404).json({ error: "Task not found or update failed" });
            }
            
            res.status(200).json({
                message: "Task updated successfully",
                task: {
                    id: data.id,
                    completed: data.completed, // Will return true/false
                    completed_at: data.completed_at
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });

    app.get('/api/dashboard/summary/:memberId', async (req, res) => {
        try {
            const { memberId } = req.params;
            if (!memberId) {
                return res.status(400).json({ error: "Member ID is required" });
            }
            const { data: staffData, error: staffError } = await supabase
                .from('staff')
                .select('name, role, branch, shift_start, shift_end')
                .eq('assigned_staff_id', memberId)
                .single();

            if (staffError || !staffData) {
                return res.status(404).json({ error: "Staff member not found" });
            }
            const { data: taskData, error: taskError } = await supabase
                .from('todos')
                .select('completed, priority')
                .eq('assigned_to', memberId);

            if (taskError) {
                console.error("Task stats error:", taskError.message);
            }
            const tasks = taskData || [];
            const totalTasks = tasks.length;
            
            // Fix: Check against boolean true/false
            const completedTasks = tasks.filter(t => t.completed === true).length;
            const pendingTasks = totalTasks - completedTasks;
            const highPriorityTasks = tasks.filter(t => t.priority === 'high' && t.completed === false).length;
            
            res.status(200).json({
                message: "Dashboard summary retrieved",
                summary: {
                    staff: {
                        name: staffData.name,
                        role: staffData.role,
                        branch: staffData.branch,
                        shift: `${staffData.shift_start} – ${staffData.shift_end}`
                    },
                    tasks: {
                        total: totalTasks,
                        completed: completedTasks,
                        pending: pendingTasks,
                        high_priority_pending: highPriorityTasks,
                        progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
                    }
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });

    app.post('/api/dashboard/tasks', async (req, res) => {
        try {
            const { assigned_to, task_title, task_description, priority, due_date, assigned_by } = req.body;

            if (!assigned_to || !task_title || !assigned_by) {
                return res.status(400).json({ 
                    error: "assigned_to, task_title, and assigned_by are required" 
                });
            }

            const { data, error } = await supabase
                .from('todos')
                .insert({
                    assigned_to,
                    task_title,
                    task_description: task_description || null,
                    priority: priority || 'low',
                    due_date: due_date || null,
                    assigned_by,
                    completed: false, // Fix: Insert boolean false instead of 'pending'
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error("Task creation error:", error.message);
                return res.status(500).json({ error: "Failed to create task" });
            }

            res.status(201).json({
                message: "Task created successfully",
                task: {
                    id: data.id,
                    assigned_to: data.assigned_to,
                    task_title: data.task_title,
                    priority: data.priority,
                    completed: data.completed,
                    created_at: data.created_at
                }
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });

    app.delete('/api/dashboard/tasks/:taskId', async (req, res) => {
        try {
            const { taskId } = req.params;

            if (!taskId) {
                return res.status(400).json({ error: "Task ID is required" });
            }

            const { error } = await supabase
                .from('todos')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error("Task deletion error:", error.message);
                return res.status(500).json({ error: "Failed to delete task" });
            }

            res.status(200).json({
                message: "Task deleted successfully"
            });
        } catch (err) {
            console.error("Server error:", err);
            res.status(500).json({ error: "Server error: " + err.message });
        }
    });
}
import * as todoLogic from './todo.js';

export function TodoRoutes(supabase, app) {
    // Todo routes
    app.get('/api/todos/:branchId', async (req, res) => {
        try {
            const data = await todoLogic.getTodosByBranch(supabase, req.params.branchId);
            res.status(200).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // todo create new 
    app.post('/api/todos', async (req, res) => {
        try {
            console.log('Request body:',req.body);
            // Validate required fields
            if (!req.body.memberId) {
                return res.status(400).json({ error: "memberId is required" });
            }
            if (!req.body.branchId) {
                return res.status(400).json({ error: "branchId is required" });
            }
            if (!req.body.title) {
                return res.status(400).json({ error: "title is required" });
            }
            
            const data = await todoLogic.addTodo(supabase, req.body);
            res.status(201).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    
    // todo status update
    app.patch('/api/todos/:id', async (req, res) => {
        try {
            const data = await todoLogic.toggleTodoStatus(supabase, req.params.id, req.body.completed);
            res.status(200).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    app.patch('/api/todos/update/:id', async (req, res) => {
        try {
            const data = await todoLogic.updateTodo(supabase, req.params.id, req.body);
            res.status(200).json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
    // todo task delete 
    app.delete('/api/todos/:id', async (req, res) => {
        try {
            await todoLogic.deleteTodo(supabase, req.params.id);
            res.status(200).json({ message: "Todo successfully deleted" });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    });
}
export function ConcernMessagesRoutes(supabase, app) {
    app.use((req, res, next) => {
        res.header('Content-Type', 'application/json');
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        next();
    });

    app.get('/api/concerns/:concernId/messages', async (req, res) => {
        const { concernId } = req.params;

        try {
            console.log(` Fetching messages for concern: ${concernId}`);
            
            if (!concernId || concernId.trim() === '') {
                return res.status(400).json({ 
                    error: "Invalid concern ID",
                    code: "INVALID_ID"
                });
            }

            const { data, error } = await supabase
                .from('concern_messages')
                .select('*')
                .eq('concern_id', concernId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error(" Fetch Messages Error:", error.message);
                return res.status(400).json({ 
                    error: error.message,
                    details: "Failed to fetch messages",
                    code: "FETCH_ERROR"
                });
            }

            console.log(` Retrieved ${(data || []).length} messages`);
            return res.status(200).json(data || []);
        } catch (err) {
            console.error(" Error fetching messages:", err);
            return res.status(500).json({ 
                error: "Internal server error", 
                details: err.message,
                code: "SERVER_ERROR"
            });
        }
    });

    app.post('/api/concerns/:concernId/messages', async (req, res) => {
        const { concernId } = req.params;
        const { sender_type, sender_id, sender_name, message } = req.body;

        console.log(` Message Request - Concern: ${concernId}`, {
            sender_type,
            sender_id,
            sender_name,
            message: message ? message.substring(0, 50) : 'N/A'
        });

        if (!concernId || concernId.trim() === '') {
            console.warn(" Invalid concern ID");
            return res.status(400).json({ 
                error: "Invalid concern ID",
                code: "INVALID_CONCERN_ID"
            });
        }

        if (!sender_type || !sender_id || !sender_name || !message) {
            console.warn(" Missing required fields");
            return res.status(400).json({ 
                error: "All fields are required",
                details: "sender_type, sender_id, sender_name, and message are required",
                code: "MISSING_FIELDS"
            });
        }

        // Validate message is not empty
        if (typeof message !== 'string' || message.trim() === '') {
            console.warn(" Empty or invalid message provided");
            return res.status(400).json({ 
                error: "Message cannot be empty",
                details: "Please provide a valid message",
                code: "EMPTY_MESSAGE"
            });
        }

        // Validate sender_type
        if (!['admin', 'branch'].includes(sender_type)) {
            console.warn(` Invalid sender_type: ${sender_type}`);
            return res.status(400).json({ 
                error: "Invalid sender_type",
                details: "sender_type must be 'admin' or 'branch'",
                code: "INVALID_SENDER_TYPE"
            });
        }

        try {
            // Verify concern exists
            console.log(` Checking if concern exists: ${concernId}`);
            const { data: concernData, error: concernError } = await supabase
                .from('concerns')
                .select('id')
                .eq('id', concernId)
                .single();

            if (concernError) {
                console.error(" Concern query error:", concernError.message);
                return res.status(404).json({ 
                    error: "Concern not found",
                    details: `No concern found with ID: ${concernId}`,
                    code: "CONCERN_NOT_FOUND"
                });
            }

            if (!concernData) {
                console.error(" No concern data found for ID:", concernId);
                return res.status(404).json({ 
                    error: "Concern not found",
                    details: `No concern found with ID: ${concernId}`,
                    code: "CONCERN_NOT_FOUND"
                });
            }

            console.log(` Inserting message for concern: ${concernId}`);
            
            // Insert message
            const { data, error } = await supabase
                .from('concern_messages')
                .insert([{
                    concern_id: concernId,
                    sender_type,
                    sender_id,
                    sender_name,
                    message: message.trim()
                }])
                .select();

            if (error) {
                console.error(" Create Message Error:", error.message);
                console.error(" Error details:", error);
                return res.status(400).json({ 
                    error: "Failed to save message",
                    details: error.message,
                    code: "INSERT_ERROR"
                });
            }

            if (!data || data.length === 0) {
                console.error(" No data returned from insert");
                return res.status(500).json({ 
                    error: "Message created but no data returned",
                    code: "NO_DATA_RETURNED"
                });
            }

            console.log(` Message created: ${data[0].id}`);
            return res.status(201).json(data[0]);
            
        } catch (err) {
            console.error(" Error sending message:", err);
            console.error(" Error stack:", err.stack);
            return res.status(500).json({ 
                error: "Internal server error", 
                details: err.message,
                code: "SERVER_ERROR"
            });
        }
    });

    // Delete a message (admin only)
    app.delete('/api/concerns/:concernId/messages/:messageId', async (req, res) => {
        const { concernId, messageId } = req.params;

        try {
            console.log(` Deleting message: ${messageId} from concern: ${concernId}`);
            const { error } = await supabase
                .from('concern_messages')
                .delete()
                .eq('id', messageId)
                .eq('concern_id', concernId);

            if (error) {
                console.error(" Delete Message Error:", error.message);
                return res.status(400).json({ 
                    error: error.message,
                    code: "DELETE_ERROR"
                });
            }

            console.log(` Message deleted: ${messageId}`);
            return res.status(200).json({ message: "Message deleted successfully" });
        } catch (err) {
            console.error(" Error deleting message:", err);
            return res.status(500).json({ 
                error: "Internal server error",
                details: err.message,
                code: "SERVER_ERROR"
            });
        }
    });

    // Get message count for a concern
    app.get('/api/concerns/:concernId/messages/count', async (req, res) => {
        const { concernId } = req.params;

        try {
            console.log(` Counting messages for concern: ${concernId}`);
            const { count, error } = await supabase
                .from('concern_messages')
                .select('id', { count: 'exact', head: true })
                .eq('concern_id', concernId);

            if (error) {
                console.error(" Count Error:", error.message);
                return res.status(400).json({ 
                    error: error.message,
                    code: "COUNT_ERROR"
                });
            }

            console.log(` Message count: ${count}`);
            return res.status(200).json({ count: count || 0 });
        } catch (err) {
            console.error(" Error counting messages:", err);
            return res.status(500).json({ 
                error: "Internal server error",
                details: err.message,
                code: "SERVER_ERROR"
            });
        }
    });
}
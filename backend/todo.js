export const getTodosByBranch = async (SupabaseClient, branchId) => {
    const {data, error} = await SupabaseClient
        .from('todos')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', {ascending: false});

    if (error) throw error;
    return data;
};
//Add the data in the todo table
export const addTodo = async (SupabaseClient, todoData) => {
    const {data,error} = await SupabaseClient
        .from('todos')
        .insert([{
            branch_id: todoData.branchId,
            title: todoData.title,
            category: todoData.category,
            priority: todoData.priority,
            due_date: todoData.dueDate,
            notes: todoData.notes,
            completed: false
        }])
        .select()
        .single();

    if(error) throw error;
    return data;
};
//complete status
export const toggleTodoStatus = async (SupabaseClient,id,isCompleted) => {
    const {data,error} = await SupabaseClient
        .from('todos')
        .update({
            completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString():null
        })
        .eq('id',id)
        .select()
        .single();
    
    if(error) throw error;
    return data;
};
//Delete todo task
export const deleteTodo = async (supabase,id) => {
    const{error} =await supabase
        .from('todos')
        .delete()
        .eq('id',id);
    
    if (error) throw error;
    return true;
}
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
            branch_id: todoData.branchId || todoData.branch_id,
            member_id: todoData.memberId || todoData.member_id,
            title: todoData.title,
            category: todoData.category,
            priority: todoData.priority,
            due_date: todoData.dueDate,
            assigned_staff_id: todoData.assignedStaffId,
            assigned_staff_name: todoData.assignedStaffName,
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
//Update the todo task
export const updateTodo = async (SupabaseClient, id, updatedData) => {
    const updatePayload = {};
    if (updatedData.title !== undefined) updatePayload.title = updatedData.title;
    if (updatedData.notes !== undefined) updatePayload.notes = updatedData.notes;
    if (updatedData.category !== undefined) updatePayload.category = updatedData.category;
    if (updatedData.priority !== undefined) updatePayload.priority = updatedData.priority;
    if (updatedData.due_date !== undefined) updatePayload.due_date = updatedData.due_date;
    if (updatedData.assigned_staff_id !== undefined) updatePayload.assigned_staff_id = updatedData.assigned_staff_id;
    if (updatedData.assigned_staff_name !== undefined) updatePayload.assigned_staff_name = updatedData.assigned_staff_name;

    const { data, error } = await SupabaseClient
        .from('todos')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
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
import { SupabaseClient } from "@supabase/supabase-js";

export const getBranchLocations = async (SupabaseClient) => {
    const {data,error} = await SupabaseClient
        .from('branches')
        .select('branch_id, branch_name,address,city,latitude,longitude');

    if(error) {
        console.error("Error fetching map data:",error.message);
        throw error;
    }
    return data;
};
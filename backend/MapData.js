import * as mapLogic from './map.js';
export function MapData(supabase,app) {
    //Map Data
    app.get('/api/branches/map', async (req, res) => {
        try {
            const locations = await mapLogic.getBranchLocations(supabase);
            res.status(200).json(locations);
        } catch (error) {
            res.status(400).json({ error: "Failed to fetch the branch locations" });
        }
    });
};
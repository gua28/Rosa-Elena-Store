import { API_BASE_URL } from './api';

const SUPABASE_URL = 'https://ghjvojncdugaifoxpwex.supabase.co';
const BUCKET_NAME = 'products'; // Assuming your bucket is named 'products'

export const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300?text=No+Image';
    
    // If it's already a full URL (like Supabase or external)
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    // IF IT'S BASE64 DATA (NEW SYSTEM), RETURN AS IS
    if (url.startsWith('data:image/')) return url;
    
    // If it refers to a local upload path from the backend
    if (url.includes('/uploads/')) {
        const fileName = url.split('/uploads/').pop();
        return `${API_BASE_URL}/uploads/${fileName}`;
    }
    
    // Default fallback: Return the Supabase public storage URL from the products bucket
    // Note: If the file is not in 'products' bucket, this might need further refinement
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${url}`;
};


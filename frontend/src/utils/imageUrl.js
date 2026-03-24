const SUPABASE_URL = 'https://ghjvojncdugaifoxpwex.supabase.co';
const BUCKET_NAME = 'products'; // Assuming your bucket is named 'products'

export const formatImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/300?text=No+Image';
    
    // If it's already a full URL (like Supabase or external)
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    // IF IT'S BASE64 DATA (NEW SYSTEM), RETURN AS IS
    if (url.startsWith('data:image/')) return url;
    
    // Extract filename if it contains old paths like '/uploads/' or 'http://127.0.0.1:8000/uploads/'
    let fileName = url;
    if (url.includes('/uploads/')) {
        fileName = url.split('/uploads/').pop();
    }
    
    // Return the Supabase public storage URL
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fileName}`;
};

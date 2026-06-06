// Mock implementation for create-checkout-session.js
async function createCheckoutSession(request) {
    const { company_id } = request.body;
    // Line 79: Add role check after company_id lookup
    const userRole = await getUserRoleFromUsersTable(company_id);
    if (!['admin', 'manager'].includes(userRole)) {
        return new Response('Forbidden', { status: 403 });
    }
    // ... rest of the function logic ...
}

async function getUserRoleFromUsersTable(companyId) {
    // Mock implementation to get user role from users table
    // Replace with actual database query
    return 'admin'; // Example role
}

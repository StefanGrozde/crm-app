// Test file for session functionality
// This can be run in the browser console to test session features

// Test session storage
function testSessionStorage() {
    const userId = 1;
    const sessionKey = `dashboard_tab_session_${userId}`;
    
    // Test data
    const testSession = {
        openTabs: [
            { id: 'view-1', name: 'Test View 1', isDefault: false },
            { id: 'search-contact-123', name: 'John Doe (Contact)', isDefault: false }
        ],
        activeTabId: 'view-1',
        tabLayouts: {
            'view-1': [
                { i: 'widget-1', x: 0, y: 0, w: 6, h: 2 }
            ]
        },
        tabEditModes: {
            'view-1': false
        },
        timestamp: Date.now()
    };
    
    // Save test session
    localStorage.setItem(sessionKey, JSON.stringify(testSession));
    console.log('Test session saved');
    
    // Load and verify
    const loadedSession = localStorage.getItem(sessionKey);
    const parsedSession = JSON.parse(loadedSession);
    console.log('Loaded session:', parsedSession);
    
    // Check if session is valid
    const isValid = parsedSession.openTabs && Array.isArray(parsedSession.openTabs) && parsedSession.openTabs.length > 0;
    console.log('Session is valid:', isValid);
    
    return isValid;
}

// Test session expiration
function testSessionExpiration() {
    const userId = 1;
    const sessionKey = `dashboard_tab_session_${userId}`;
    
    // Create an expired session (25 hours old)
    const expiredSession = {
        openTabs: [{ id: 'test', name: 'Test', isDefault: false }],
        activeTabId: 'test',
        tabLayouts: {},
        tabEditModes: {},
        timestamp: Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
    };
    
    localStorage.setItem(sessionKey, JSON.stringify(expiredSession));
    console.log('Expired session saved');
    
    // Check if it's expired
    const savedSession = localStorage.getItem(sessionKey);
    if (savedSession) {
        const sessionData = JSON.parse(savedSession);
        const sessionAge = Date.now() - sessionData.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        const isExpired = sessionAge > maxAge;
        
        console.log('Session age:', Math.round(sessionAge / 1000 / 60), 'minutes');
        console.log('Max age:', Math.round(maxAge / 1000 / 60), 'minutes');
        console.log('Is expired:', isExpired);
        
        if (isExpired) {
            localStorage.removeItem(sessionKey);
            console.log('Expired session cleared');
        }
    }
}

// Run tests
console.log('=== Session Storage Tests ===');
testSessionStorage();
console.log('\n=== Session Expiration Tests ===');
testSessionExpiration();

// Test file to verify session loading behavior
// This can be run in the browser console to test session functionality

const testSessionLoading = () => {
    console.log('Testing session loading...');
    
    // Simulate the session data structure
    const testSessionData = {
        openTabs: [
            { id: 1, name: 'Test View 1', isDefault: false },
            { id: 2, name: 'Test View 2', isDefault: true }
        ],
        activeTabId: 1,
        tabLayouts: {
            1: [{ i: 'contacts-widget', x: 0, y: 0, w: 6, h: 2 }],
            2: [{ i: 'leads-widget', x: 0, y: 0, w: 6, h: 2 }]
        },
        tabEditModes: {},
        timestamp: Date.now()
    };
    
    // Save test session
    const sessionKey = 'dashboard_tab_session_test_user';
    localStorage.setItem(sessionKey, JSON.stringify(testSessionData));
    
    console.log('Test session saved:', testSessionData);
    
    // Verify session exists
    const savedSession = localStorage.getItem(sessionKey);
    if (savedSession) {
        const parsed = JSON.parse(savedSession);
        console.log('Session verification successful:', parsed);
        return true;
    } else {
        console.error('Session verification failed');
        return false;
    }
};

const clearTestSession = () => {
    const sessionKey = 'dashboard_tab_session_test_user';
    localStorage.removeItem(sessionKey);
    console.log('Test session cleared');
};

// Export for use in browser console
if (typeof window !== 'undefined') {
    window.testSessionLoading = testSessionLoading;
    window.clearTestSession = clearTestSession;
}

export { testSessionLoading, clearTestSession }; 
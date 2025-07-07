import { useState, useEffect, useCallback } from 'react';

const SESSION_STORAGE_KEY = 'dashboard_tab_session';
const SESSION_EXPIRY_HOURS = 24; // Session expires after 24 hours

export const useTabSession = (userId) => {
    const [openTabs, setOpenTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [tabLayouts, setTabLayouts] = useState({});
    const [tabEditModes, setTabEditModes] = useState({});
    const [isSessionLoading, setIsSessionLoading] = useState(true);

    // Load session data from localStorage
    const loadSession = useCallback(() => {
        try {
            setIsSessionLoading(true);
            const sessionKey = `${SESSION_STORAGE_KEY}_${userId}`;
            const savedSession = localStorage.getItem(sessionKey);
            
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                console.log('Loaded session data:', sessionData);
                
                // Validate session data structure
                if (sessionData.openTabs && Array.isArray(sessionData.openTabs)) {
                    setOpenTabs(sessionData.openTabs);
                    // Ensure activeTabId is properly handled (could be string or number)
                    const activeTab = sessionData.activeTabId;
                    console.log('Loading activeTabId:', activeTab, 'Type:', typeof activeTab);
                    setActiveTabId(activeTab || null);
                    setTabLayouts(sessionData.tabLayouts || {});
                    setTabEditModes(sessionData.tabEditModes || {});
                    setIsSessionLoading(false);
                    return true;
                }
            }
            setIsSessionLoading(false);
        } catch (error) {
            console.error('Failed to load session data:', error);
            setIsSessionLoading(false);
        }
        return false;
    }, [userId]);

    // Check if session exists without loading it
    const hasSession = useCallback(() => {
        try {
            const sessionKey = `${SESSION_STORAGE_KEY}_${userId}`;
            const savedSession = localStorage.getItem(sessionKey);
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                
                // Check if session has expired
                if (sessionData.timestamp) {
                    const sessionAge = Date.now() - sessionData.timestamp;
                    const maxAge = SESSION_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds
                    
                    if (sessionAge > maxAge) {
                        console.log('Session expired, clearing...');
                        localStorage.removeItem(sessionKey);
                        return false;
                    }
                }
                
                return sessionData.openTabs && Array.isArray(sessionData.openTabs) && sessionData.openTabs.length > 0;
            }
        } catch (error) {
            console.error('Failed to check session data:', error);
        }
        return false;
    }, [userId]);

    // Save session data to localStorage
    const saveSession = useCallback((tabs, activeTab, layouts, editModes) => {
        try {
            const sessionKey = `${SESSION_STORAGE_KEY}_${userId}`;
            const sessionData = {
                openTabs: tabs || [],
                activeTabId: activeTab,
                tabLayouts: layouts || {},
                tabEditModes: editModes || {},
                timestamp: Date.now()
            };
            
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
            console.log('Saved session data:', sessionData);
            console.log('Active tab being saved:', activeTab, 'Type:', typeof activeTab);
        } catch (error) {
            console.error('Failed to save session data:', error);
        }
    }, [userId]);

    // Clear session data
    const clearSession = useCallback(() => {
        try {
            const sessionKey = `${SESSION_STORAGE_KEY}_${userId}`;
            localStorage.removeItem(sessionKey);
            console.log('Cleared session data for user:', userId);
        } catch (error) {
            console.error('Failed to clear session data:', error);
        }
    }, [userId]);

    // Get session info for debugging
    const getSessionInfo = useCallback(() => {
        try {
            const sessionKey = `${SESSION_STORAGE_KEY}_${userId}`;
            const savedSession = localStorage.getItem(sessionKey);
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                const sessionAge = sessionData.timestamp ? Date.now() - sessionData.timestamp : 0;
                const maxAge = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
                const isExpired = sessionAge > maxAge;
                
                return {
                    exists: true,
                    tabCount: sessionData.openTabs?.length || 0,
                    activeTab: sessionData.activeTabId,
                    age: sessionAge,
                    maxAge: maxAge,
                    isExpired: isExpired,
                    expiresIn: maxAge - sessionAge
                };
            }
            return { exists: false };
        } catch (error) {
            console.error('Failed to get session info:', error);
            return { exists: false, error: error.message };
        }
    }, [userId]);

    // Update session when tab state changes
    useEffect(() => {
        if (userId && (openTabs.length > 0 || activeTabId)) {
            saveSession(openTabs, activeTabId, tabLayouts, tabEditModes);
        }
    }, [openTabs, activeTabId, tabLayouts, tabEditModes, saveSession, userId]);

    // Load session on mount
    useEffect(() => {
        if (userId) {
            loadSession();
        } else {
            setIsSessionLoading(false);
        }
    }, [userId, loadSession]);

    // Clear session on window unload (optional - for cleanup)
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Optionally clear old sessions on page unload
            // This could be used to implement session expiration
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return {
        openTabs,
        setOpenTabs,
        activeTabId,
        setActiveTabId,
        tabLayouts,
        setTabLayouts,
        tabEditModes,
        setTabEditModes,
        loadSession,
        saveSession,
        clearSession,
        hasSession,
        getSessionInfo,
        isSessionLoading
    };
}; 
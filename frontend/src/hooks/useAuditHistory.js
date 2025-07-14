import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for managing audit history for entities
 * @param {string} entityType - Type of entity (contact, lead, task, etc.)
 * @param {number} entityId - ID of the entity
 * @param {Object} options - Additional options
 * @returns {Object} - Audit history state and methods
 */
export const useAuditHistory = (entityType, entityId, options = {}) => {
  const { user } = useContext(AuthContext);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAccess, setHasAccess] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1,
    limit: options.limit || 50
  });

  const {
    autoFetch = true,
    limit = 50,
    filters = {},
    realTimeUpdates = false
  } = options;

  const HIGH_SECURITY_ENTITIES = useMemo(() => ['user', 'company', 'system', 'security'], []);

  // Check access permissions
  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      return;
    }

    // Check if user has access to view audit logs for this entity type
    if (HIGH_SECURITY_ENTITIES.includes(entityType) && user.role !== 'Administrator') {
      setHasAccess(false);
    } else {
      setHasAccess(true);
    }
  }, [entityType, user, HIGH_SECURITY_ENTITIES]);

  /**
   * Fetch audit logs from API
   */
  const fetchAuditLogs = useCallback(async (page = 1, additionalFilters = {}) => {
    if (!hasAccess || !entityType || !entityId || !user) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        ...filters,
        ...additionalFilters
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/audit-logs/entity/${entityType}/${entityId}?${queryParams}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          setHasAccess(false);
          return;
        }
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      
      if (data.success) {
        setAuditLogs(data.data || []);
        setPagination({
          total: data.total || 0,
          pages: data.pagination?.pages || 0,
          currentPage: page,
          limit: data.pagination?.limit || limit
        });
      } else {
        throw new Error(data.message || 'Failed to fetch audit logs');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, user, hasAccess, limit]);

  /**
   * Refresh audit logs
   */
  const refresh = useCallback(() => {
    fetchAuditLogs(1); // Always refresh from page 1
  }, [fetchAuditLogs]);

  /**
   * Load next page
   */
  const loadNextPage = useCallback(() => {
    if (pagination.currentPage < pagination.pages) {
      fetchAuditLogs(pagination.currentPage + 1);
    }
  }, [fetchAuditLogs, pagination]);

  /**
   * Load previous page
   */
  const loadPreviousPage = useCallback(() => {
    if (pagination.currentPage > 1) {
      fetchAuditLogs(pagination.currentPage - 1);
    }
  }, [fetchAuditLogs, pagination]);

  /**
   * Go to specific page
   */
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.pages) {
      fetchAuditLogs(page);
    }
  }, [fetchAuditLogs, pagination.pages]);

  /**
   * Apply filters
   */
  const applyFilters = useCallback((newFilters) => {
    fetchAuditLogs(1, newFilters);
  }, [fetchAuditLogs]);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    fetchAuditLogs(1, {});
  }, [fetchAuditLogs]);

  // Auto-fetch on mount and when key dependencies change
  useEffect(() => {
    if (autoFetch && hasAccess && entityType && entityId && user) {
      fetchAuditLogs();
    }
  }, [entityType, entityId, autoFetch, hasAccess, user?.id]);

  // Real-time updates via polling (disabled to prevent excessive requests)
  useEffect(() => {
    // Temporarily disabled to prevent excessive API calls
    // TODO: Re-implement with proper debouncing and optimization
    return;
    
    if (!realTimeUpdates || !hasAccess) return;

    const interval = setInterval(() => {
      fetchAuditLogs(pagination.currentPage);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates, hasAccess]);

  return {
    // Data
    auditLogs,
    loading,
    error,
    hasAccess,
    pagination,
    
    // Methods
    fetchAuditLogs,
    refresh,
    loadNextPage,
    loadPreviousPage,
    goToPage,
    applyFilters,
    clearFilters,
    
    // Computed values
    hasNextPage: pagination.currentPage < pagination.pages,
    hasPreviousPage: pagination.currentPage > 1,
    isEmpty: auditLogs.length === 0,
    isFirstLoad: loading && auditLogs.length === 0
  };
};

/**
 * Hook for user session history
 */
export const useUserSessionHistory = (userId = null, options = {}) => {
  const { user } = useContext(AuthContext);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const targetUserId = userId || user?.id;
  const { autoFetch = true, limit = 50 } = options;

  const fetchSessionHistory = useCallback(async () => {
    if (!targetUserId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const endpoint = userId && user.role === 'Administrator' 
        ? `/api/audit-logs/admin/sessions/user/${targetUserId}`
        : '/api/audit-logs/sessions/history';

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}${endpoint}?limit=${limit}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }

      const data = await response.json();
      
      if (data.success) {
        setSessions(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch session history');
      }
    } catch (err) {
      console.error('Error fetching session history:', err);
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [targetUserId, user, userId, limit]);

  useEffect(() => {
    if (autoFetch) {
      fetchSessionHistory();
    }
  }, [fetchSessionHistory, autoFetch]);

  return {
    sessions,
    loading,
    error,
    refresh: fetchSessionHistory
  };
};

/**
 * Hook for active sessions management
 */
export const useActiveSessions = (options = {}) => {
  const { user } = useContext(AuthContext);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { autoFetch = true } = options;

  const fetchActiveSessions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const endpoint = user.role === 'Administrator' 
        ? '/api/audit-logs/admin/sessions/active'
        : '/api/audit-logs/sessions/my';

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}${endpoint}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch active sessions');
      }

      const data = await response.json();
      
      if (data.success) {
        setActiveSessions(data.data || []);
      } else {
        throw new Error(data.message || 'Failed to fetch active sessions');
      }
    } catch (err) {
      console.error('Error fetching active sessions:', err);
      setError(err.message);
      setActiveSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const terminateSession = useCallback(async (sessionToken) => {
    if (!user) return false;

    try {
      const endpoint = user.role === 'Administrator'
        ? `/api/audit-logs/admin/sessions/${sessionToken}/force-logout`
        : `/api/audit-logs/sessions/${sessionToken}/terminate`;

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}${endpoint}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to terminate session');
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh active sessions list
        await fetchActiveSessions();
        return true;
      } else {
        throw new Error(data.message || 'Failed to terminate session');
      }
    } catch (err) {
      console.error('Error terminating session:', err);
      setError(err.message);
      return false;
    }
  }, [user, fetchActiveSessions]);

  useEffect(() => {
    if (autoFetch) {
      fetchActiveSessions();
    }
  }, [fetchActiveSessions, autoFetch]);

  return {
    activeSessions,
    loading,
    error,
    refresh: fetchActiveSessions,
    terminateSession
  };
};

/**
 * Hook for audit statistics
 */
export const useAuditStats = (options = {}) => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { autoFetch = true } = options;

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/audit-logs/stats`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch audit statistics');
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch audit statistics');
      }
    } catch (err) {
      console.error('Error fetching audit stats:', err);
      setError(err.message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (autoFetch) {
      fetchStats();
    }
  }, [fetchStats, autoFetch]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats
  };
};

export default useAuditHistory;
const AuditService = require('../services/AuditService');

/**
 * Audit hooks utility for Sequelize models
 * Provides reusable hooks for automatic audit logging
 */

/**
 * Add comprehensive audit hooks to a Sequelize model
 * @param {Object} model - Sequelize model instance
 * @param {string} entityType - Entity type name for audit logs
 * @param {Object} options - Configuration options
 */
function addAuditHooks(model, entityType, options = {}) {
    const {
        excludeFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'],
        sensitiveFields = [],
        includeRelations = false,
        customMetadata = null
    } = options;

    // Helper function to get context from options
    const getContext = (sequelizeOptions) => {
        return {
            userId: sequelizeOptions.userId || sequelizeOptions.user?.id,
            companyId: sequelizeOptions.companyId || sequelizeOptions.user?.companyId,
            ipAddress: sequelizeOptions.ipAddress,
            userAgent: sequelizeOptions.userAgent,
            sessionId: sequelizeOptions.sessionId,
            transaction: sequelizeOptions.transaction
        };
    };

    // Helper function to get relevant field changes
    const getFieldChanges = (instance, previousValues = null) => {
        const changes = [];
        const currentValues = instance.dataValues;
        
        Object.keys(currentValues).forEach(field => {
            if (excludeFields.includes(field)) return;
            
            const newValue = currentValues[field];
            const oldValue = previousValues ? previousValues[field] : null;
            
            // Only track actual changes for updates
            if (previousValues && JSON.stringify(oldValue) === JSON.stringify(newValue)) {
                return;
            }
            
            changes.push({
                field,
                oldValue,
                newValue,
                isSensitive: sensitiveFields.includes(field)
            });
        });
        
        return changes;
    };

    // Hook: After Create
    model.addHook('afterCreate', async (instance, options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return; // Skip if no user context
            
            const fieldChanges = getFieldChanges(instance);
            
            // Log the creation
            await AuditService.logChange({
                entityType,
                entityId: instance.id,
                operation: 'CREATE',
                userId: context.userId,
                companyId: context.companyId,
                newValue: instance.dataValues,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                metadata: {
                    fieldsCreated: fieldChanges.length,
                    sensitiveFields: fieldChanges.filter(c => c.isSensitive).map(c => c.field),
                    ...(customMetadata ? customMetadata(instance, 'CREATE', context) : {})
                }
            });
            
        } catch (error) {
            console.error(`Error logging audit for ${entityType} creation:`, error);
        }
    });

    // Hook: Before Update (to capture old values)
    model.addHook('beforeUpdate', async (instance, options) => {
        // Store previous values for comparison in afterUpdate
        if (instance._previousDataValues) {
            options.auditPreviousValues = { ...instance._previousDataValues };
        } else {
            // Fallback: fetch current values from database
            try {
                const current = await model.findByPk(instance.id, {
                    attributes: Object.keys(instance.dataValues),
                    transaction: options.transaction
                });
                options.auditPreviousValues = current ? current.dataValues : {};
            } catch (error) {
                console.error(`Error fetching previous values for ${entityType}:`, error);
                options.auditPreviousValues = {};
            }
        }
    });

    // Hook: After Update
    model.addHook('afterUpdate', async (instance, options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return; // Skip if no user context
            
            const previousValues = options.auditPreviousValues || {};
            const fieldChanges = getFieldChanges(instance, previousValues);
            
            // Only log if there are actual changes
            if (fieldChanges.length === 0) return;
            
            // Log each field change separately for better granularity
            for (const change of fieldChanges) {
                await AuditService.logChange({
                    entityType,
                    entityId: instance.id,
                    operation: 'UPDATE',
                    userId: context.userId,
                    companyId: context.companyId,
                    fieldName: change.field,
                    oldValue: change.oldValue,
                    newValue: change.newValue,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    sessionId: context.sessionId,
                    metadata: {
                        isSensitiveField: change.isSensitive,
                        totalChanges: fieldChanges.length,
                        ...(customMetadata ? customMetadata(instance, 'UPDATE', context, change) : {})
                    }
                });
            }
            
        } catch (error) {
            console.error(`Error logging audit for ${entityType} update:`, error);
        }
    });

    // Hook: Before Destroy (to capture values being deleted)
    model.addHook('beforeDestroy', async (instance, options) => {
        // Store values for the afterDestroy hook
        options.auditDeletedValues = { ...instance.dataValues };
    });

    // Hook: After Destroy
    model.addHook('afterDestroy', async (instance, options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return; // Skip if no user context
            
            const deletedValues = options.auditDeletedValues || instance.dataValues;
            
            await AuditService.logChange({
                entityType,
                entityId: instance.id,
                operation: 'DELETE',
                userId: context.userId,
                companyId: context.companyId,
                oldValue: deletedValues,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                metadata: {
                    deletedFields: Object.keys(deletedValues).filter(f => !excludeFields.includes(f)),
                    ...(customMetadata ? customMetadata(instance, 'DELETE', context) : {})
                }
            });
            
        } catch (error) {
            console.error(`Error logging audit for ${entityType} deletion:`, error);
        }
    });

    // Hook: After Bulk Create
    model.addHook('afterBulkCreate', async (instances, options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return;
            
            // Log bulk creation
            await AuditService.logChange({
                entityType,
                entityId: null,
                operation: 'CREATE',
                userId: context.userId,
                companyId: context.companyId,
                newValue: instances.map(i => i.dataValues),
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                metadata: {
                    operationType: 'BULK_CREATE',
                    recordCount: instances.length,
                    recordIds: instances.map(i => i.id),
                    ...(customMetadata ? customMetadata(instances, 'BULK_CREATE', context) : {})
                }
            });
            
        } catch (error) {
            console.error(`Error logging bulk audit for ${entityType} creation:`, error);
        }
    });

    // Hook: After Bulk Update
    model.addHook('afterBulkUpdate', async (options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return;
            
            await AuditService.logChange({
                entityType,
                entityId: null,
                operation: 'UPDATE',
                userId: context.userId,
                companyId: context.companyId,
                newValue: options.attributes,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                metadata: {
                    operationType: 'BULK_UPDATE',
                    whereClause: options.where,
                    updatedFields: Object.keys(options.attributes || {}),
                    ...(customMetadata ? customMetadata(null, 'BULK_UPDATE', context) : {})
                }
            });
            
        } catch (error) {
            console.error(`Error logging bulk audit for ${entityType} update:`, error);
        }
    });

    // Hook: After Bulk Destroy
    model.addHook('afterBulkDestroy', async (options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return;
            
            await AuditService.logChange({
                entityType,
                entityId: null,
                operation: 'DELETE',
                userId: context.userId,
                companyId: context.companyId,
                oldValue: options.where,
                ipAddress: context.ipAddress,
                userAgent: context.userAgent,
                sessionId: context.sessionId,
                metadata: {
                    operationType: 'BULK_DELETE',
                    whereClause: options.where,
                    ...(customMetadata ? customMetadata(null, 'BULK_DELETE', context) : {})
                }
            });
            
        } catch (error) {
            console.error(`Error logging bulk audit for ${entityType} deletion:`, error);
        }
    });

    console.log(`✅ Audit hooks added to ${entityType} model`);
}

/**
 * Enhanced audit hooks for sensitive entities (User, Company)
 * Includes additional security measures and detailed logging
 */
function addSensitiveAuditHooks(model, entityType, options = {}) {
    const defaultSensitiveFields = {
        user: ['password_hash', 'passwordHash', 'role', 'email', 'isActive'],
        company: ['ms365_client_secret', 'ms365ClientSecret', 'api_keys', 'apiKeys', 'billing_info', 'billingInfo']
    };

    const enhancedOptions = {
        ...options,
        sensitiveFields: [
            ...(defaultSensitiveFields[entityType.toLowerCase()] || []),
            ...(options.sensitiveFields || [])
        ],
        customMetadata: (instance, operation, context, change) => {
            const baseMetadata = options.customMetadata ? 
                options.customMetadata(instance, operation, context, change) : {};
            
            return {
                ...baseMetadata,
                securityLevel: 'HIGH',
                requiresApproval: ['role', 'permissions', 'isActive'].includes(change?.field),
                alertAdmins: operation === 'DELETE' || 
                           (operation === 'UPDATE' && ['role', 'isActive'].includes(change?.field)),
                ipGeolocation: context.ipAddress ? `IP: ${context.ipAddress}` : null
            };
        }
    };

    // Add standard audit hooks with enhanced options
    addAuditHooks(model, entityType, enhancedOptions);

    // Add additional security-specific hooks
    model.addHook('afterUpdate', async (instance, options) => {
        try {
            const context = getContext(options);
            if (!context.userId) return;

            // Check for critical security changes
            const previousValues = options.auditPreviousValues || {};
            const criticalChanges = [];

            // Role changes
            if (entityType.toLowerCase() === 'user' && 
                previousValues.role !== instance.role) {
                criticalChanges.push({
                    type: 'ROLE_CHANGE',
                    field: 'role',
                    from: previousValues.role,
                    to: instance.role
                });
            }

            // Account status changes
            if (entityType.toLowerCase() === 'user' && 
                previousValues.isActive !== instance.isActive) {
                criticalChanges.push({
                    type: instance.isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
                    field: 'isActive',
                    from: previousValues.isActive,
                    to: instance.isActive
                });
            }

            // Log critical security events
            for (const criticalChange of criticalChanges) {
                await AuditService.logChange({
                    entityType: 'security',
                    entityId: instance.id,
                    operation: criticalChange.type,
                    userId: context.userId,
                    companyId: context.companyId,
                    fieldName: criticalChange.field,
                    oldValue: criticalChange.from,
                    newValue: criticalChange.to,
                    ipAddress: context.ipAddress,
                    userAgent: context.userAgent,
                    sessionId: context.sessionId,
                    metadata: {
                        securityEvent: true,
                        eventType: criticalChange.type,
                        targetEntityType: entityType,
                        targetEntityId: instance.id,
                        requiresReview: true
                    }
                });
            }

        } catch (error) {
            console.error(`Error logging security audit for ${entityType}:`, error);
        }
    });

    console.log(`🔒 Enhanced security audit hooks added to ${entityType} model`);
}

/**
 * Helper function to get audit context from request
 */
function getAuditContext(req) {
    return {
        userId: req.user?.id,
        companyId: req.user?.companyId,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
        sessionId: req.cookies?.authToken || req.headers?.authorization
    };
}

/**
 * Middleware to inject audit context into Sequelize options
 */
function injectAuditContext(req, res, next) {
    // Store original Sequelize methods
    const originalCreate = req.app.locals.sequelize?.models?.Contact?.create;
    
    // Override req object to automatically include audit context in database operations
    req.withAuditContext = (sequelizeOptions = {}) => {
        return {
            ...sequelizeOptions,
            ...getAuditContext(req)
        };
    };
    
    next();
}

module.exports = {
    addAuditHooks,
    addSensitiveAuditHooks,
    getAuditContext,
    injectAuditContext
};
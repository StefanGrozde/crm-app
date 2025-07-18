import React, { useMemo } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { WidgetRenderer } from './WidgetRenderer';
import { getProfileProps } from '../utils/profileConfig';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const DashboardGrid = ({ 
    layout, 
    widgetLibrary, 
    isVisible = true,
    onWidgetReady,
    onWidgetError,
    onOpenContactProfile,
    onOpenLeadProfile,
    onOpenOpportunityProfile,
    onOpenBusinessProfile,
    onOpenUserProfile,
    onOpenSaleProfile,
    onOpenTaskProfile,
    onOpenTicketProfile
}) => {
    // Unified profile handlers object
    const profileHandlers = useMemo(() => ({
        contact: onOpenContactProfile,
        lead: onOpenLeadProfile,
        opportunity: onOpenOpportunityProfile,
        business: onOpenBusinessProfile,
        user: onOpenUserProfile,
        sales: onOpenSaleProfile,
        task: onOpenTaskProfile,
        ticket: onOpenTicketProfile
    }), [onOpenContactProfile, onOpenLeadProfile, onOpenOpportunityProfile, onOpenBusinessProfile, onOpenUserProfile, onOpenSaleProfile, onOpenTaskProfile, onOpenTicketProfile]);

    // Skip rendering if no layout or widget library
    if (!layout || !widgetLibrary || layout.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 text-lg">
                    No widgets in this layout.
                </div>
            </div>
        );
    }

    return (
        <>
            <style>
                {`
                   /* Clean grid layout styles - extracted from EditLayout */
                   .react-grid-layout {
                       position: relative;
                       transition: height 200ms ease;
                   }
                   .react-grid-item {
                       transition: all 200ms ease;
                       transition-property: left, top, width, height;
                       position: absolute;
                       box-sizing: border-box;
                   }
                   .react-grid-item.cssTransforms {
                       transition-property: transform, width, height;
                   }
                   .react-grid-item.resizing {
                       z-index: 1;
                       will-change: width, height;
                   }
                   .react-grid-item.react-draggable-dragging {
                       transition: none !important;
                       z-index: 3 !important;
                       will-change: transform;
                   }
                   .react-grid-item.react-grid-placeholder {
                       background: #cbd5e0 !important;
                       border: 2px dashed #718096 !important;
                       border-radius: 8px !important;
                       transition-duration: 100ms;
                       z-index: 2;
                       -webkit-user-select: none;
                       -moz-user-select: none;
                       -ms-user-select: none;
                       -o-user-select: none;
                       user-select: none;
                   }
                   .react-grid-item.react-grid-item.react-draggable.react-resizable {
                       transition: all 200ms ease;
                   }
                   .react-grid-item.react-grid-item.react-draggable.react-resizable.react-resizable-handle {
                       transition: none;
                   }
                   
                   /* Widget container styles */
                   .widget-container {
                       border-radius: 0.5rem;
                       border: 1px solid #9ca3af;
                       transition: all 0.2s ease;
                   }
                   
                   /* Hover effect for widget containers */
                   .widget-container:hover {
                       border-color: #4b5563;
                       box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                   }
                   
                   /* Remove borders from all descendants to prevent double borders */
                   .widget-container * {
                       border: none !important;
                   }
                   
                   .widget-container.error {
                       border: 2px solid #ef4444;
                   }
                   
                   .widget-container.loading {
                       border: 2px solid #6b7280;
                   }
               `}
            </style>
            
            <ResponsiveReactGridLayout
                layouts={{ lg: layout }}
                className="layout"
                cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                rowHeight={120}
                isDraggable={false}
                isResizable={false}
                margin={[10, 10]}
                containerPadding={[10, 10]}
                style={{ minHeight: '400px', maxHeight: '80vh' }}
                useCSSTransforms={true}
                compactType="vertical"
                preventCollision={false}
                isBounded={false}
                autoSize={false}
                verticalCompact={true}
                allowOverlap={false}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                onBreakpointChange={(newBreakpoint) => {
                    console.log('DashboardGrid breakpoint changed to:', newBreakpoint);
                }}
            >
                        {layout.map(item => {
                            console.log('Rendering layout item:', item);
                            
                            // Determine the widget key to look for
                            const widgetKeyToFind = item.widgetKey || item.i;
                            
                            // Handle dynamic widget keys (e.g., lead-profile-widget-34 -> lead-profile-widget)
                            let lookupKey = widgetKeyToFind;
                            if (widgetKeyToFind.includes('-widget-')) {
                                lookupKey = widgetKeyToFind.split('-widget-')[0] + '-widget';
                            }
                            
                            console.log('Looking for widget:', widgetKeyToFind, 'lookup key:', lookupKey, 'in library:', widgetLibrary);
                            const widget = widgetLibrary.find(w => w.key === lookupKey);
                            console.log('Found widget:', widget);
                            
                            // Skip rendering if widget library is not loaded yet
                            if (widgetLibrary.length === 0) {
                                return (
                                    <div key={item.i} className="widget-container loading p-4">
                                        <div className="text-gray-500">Loading widget library...</div>
                                    </div>
                                );
                            }
                            
                            if (!widget) {
                                return (
                                    <div 
                                        key={item.i} 
                                        className="widget-container error p-4 overflow-auto relative"
                                        data-widget-key={item.i}
                                    >
                                        <div className="text-center">
                                            <div className="text-red-600 text-sm font-medium">
                                                Widget not found: {item.i}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Original key: {widgetKeyToFind} | Lookup key: {lookupKey}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                This widget may have been removed or renamed.
                                            </div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Size: {item.w}x{item.h} | Position: ({item.x}, {item.y})
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div 
                                    key={item.i} 
                                    className="widget-container bg-white p-2 overflow-auto relative"
                                    style={{ maxHeight: '70vh' }}
                                    data-widget-key={item.i}
                                    data-grid-x={item.x}
                                    data-grid-y={item.y}
                                    data-grid-w={item.w}
                                    data-grid-h={item.h}
                                >
                                    {/* Widget content with robust rendering */}
                                    <div>
                                        <WidgetRenderer 
                                            widgetKey={widgetKeyToFind} 
                                            widgetPath={widget?.path} 
                                            type={widget?.type}
                                            resultData={item.i.startsWith('search-result-') ? item.resultData : undefined}
                                            widgetData={item.widgetData}
                                            isVisible={isVisible}
                                            onWidgetReady={onWidgetReady}
                                            onWidgetError={onWidgetError}
                                            {...getProfileProps(lookupKey, profileHandlers)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </ResponsiveReactGridLayout>
        </>
    );
};

export default DashboardGrid; 
import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { WidgetRenderer } from './WidgetRenderer';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const DashboardGrid = ({ 
    layout, 
    widgetLibrary, 
    isVisible = true,
    isDashboardView = true,
    onWidgetReady,
    onWidgetError,
    onOpenContactProfile,
    onOpenLeadProfile,
    onOpenOpportunityProfile,
    onOpenBusinessProfile,
    onOpenUserProfile
}) => {
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

    // Calculate if content exceeds 12-column grid width for non-DashboardView tabs
    const needsScroll = !isDashboardView && layout.some(item => {
        const rightEdge = item.x + item.w;
        return rightEdge > 12;
    });

    // Calculate the maximum width needed
    const maxWidth = needsScroll ? Math.max(...layout.map(item => item.x + item.w)) * 100 : 1200; // 100px per column

    // Debug logging
    if (!isDashboardView) {
        console.log('DashboardGrid - Non-DashboardView tab detected');
        console.log('Layout items:', layout.map(item => ({ i: item.i, x: item.x, w: item.w, rightEdge: item.x + item.w })));
        console.log('Needs scroll:', needsScroll);
        console.log('Max width:', maxWidth);
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
                   
                   /* Enhanced widget separation styles */
                   .widget-container {
                       background: #ffffff;
                       border-radius: 0.5rem;
                       box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                       transition: box-shadow 0.2s ease;
                   }
                   
                   .widget-container:hover {
                       box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                   }
                   
                   .widget-container.error {
                       box-shadow: 0 1px 3px 0 rgba(239, 68, 68, 0.2), 0 1px 2px 0 rgba(239, 68, 68, 0.1);
                   }
                   
                   .widget-container.loading {
                       box-shadow: 0 1px 3px 0 rgba(107, 114, 128, 0.2), 0 1px 2px 0 rgba(107, 114, 128, 0.1);
                   }

                   /* Scroll container for non-DashboardView tabs */
                   .scrollable-grid-container {
                       overflow-x: auto;
                       overflow-y: hidden;
                       scrollbar-width: thin;
                       scrollbar-color: #9ca3af #f3f4f6;
                       border: 1px solid #e5e7eb;
                       border-radius: 0.5rem;
                       background: #f9fafb;
                   }
                   
                   .scrollable-grid-container::-webkit-scrollbar {
                       height: 12px;
                   }
                   
                   .scrollable-grid-container::-webkit-scrollbar-track {
                       background: #f3f4f6;
                       border-radius: 6px;
                       margin: 2px;
                   }
                   
                   .scrollable-grid-container::-webkit-scrollbar-thumb {
                       background: #9ca3af;
                       border-radius: 6px;
                       border: 2px solid #f3f4f6;
                   }
                   
                   .scrollable-grid-container::-webkit-scrollbar-thumb:hover {
                       background: #6b7280;
                   }
                   
                   .scrollable-grid-container::-webkit-scrollbar-corner {
                       background: #f3f4f6;
                   }
               `}
            </style>
            
            <div className={needsScroll ? "scrollable-grid-container" : ""} style={needsScroll ? { width: '100%' } : {}}>
                {needsScroll && (
                    <div className="bg-blue-100 border border-blue-300 rounded-lg p-2 mb-2 text-xs text-blue-800">
                        <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                            </svg>
                            <span>Content extends beyond view. Scroll horizontally to see more.</span>
                        </div>
                    </div>
                )}
                <div style={needsScroll ? { width: `${maxWidth}px`, minWidth: '100%' } : {}}>
                    <ResponsiveReactGridLayout
                        layouts={{ lg: layout }}
                        className="layout"
                        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
                        rowHeight={100}
                        isDraggable={false}
                        isResizable={false}
                        margin={[10, 10]}
                        containerPadding={[10, 10]}
                        style={{ minHeight: '400px' }}
                        useCSSTransforms={true}
                        compactType="vertical"
                        preventCollision={false}
                        isBounded={false}
                        autoSize={true}
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
                                        className="widget-container error p-4 overflow-hidden relative"
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
                                    className="widget-container bg-white p-2 overflow-hidden relative"
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
                                            onOpenContactProfile={onOpenContactProfile}
                                            onOpenLeadProfile={onOpenLeadProfile}
                                            onOpenOpportunityProfile={onOpenOpportunityProfile}
                                            onOpenBusinessProfile={onOpenBusinessProfile}
                                            onOpenUserProfile={onOpenUserProfile}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </ResponsiveReactGridLayout>
                </div>
            </div>
        </>
    );
};

export default DashboardGrid; 
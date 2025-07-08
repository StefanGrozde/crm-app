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
    onWidgetReady,
    onWidgetError,
    onOpenContactProfile,
    onOpenLeadProfile,
    onOpenOpportunityProfile,
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
               `}
            </style>
            
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
                    console.log('Looking for widget:', widgetKeyToFind, 'in library:', widgetLibrary);
                    const widget = widgetLibrary.find(w => w.key === widgetKeyToFind);
                    console.log('Found widget:', widget);
                    
                    // Skip rendering if widget library is not loaded yet
                    if (widgetLibrary.length === 0) {
                        return (
                            <div key={item.i} className="bg-white rounded-lg shadow-lg p-4">
                                <div className="text-gray-500">Loading widget library...</div>
                            </div>
                        );
                    }
                    
                    if (!widget) {
                        return (
                            <div 
                                key={item.i} 
                                className="bg-white rounded-lg shadow-lg p-4 overflow-hidden transition-all duration-200 relative"
                                data-widget-key={item.i}
                            >
                                <div className="text-center">
                                    <div className="text-red-600 text-sm font-medium">
                                        Widget not found: {item.i}
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
                            className="bg-white rounded-lg shadow-lg p-2 overflow-hidden transition-all duration-200 relative"
                            data-widget-key={item.i}
                            data-grid-x={item.x}
                            data-grid-y={item.y}
                            data-grid-w={item.w}
                            data-grid-h={item.h}
                        >
                            {/* Widget content with robust rendering */}
                            <div>
                                {console.log('Rendering widget:', item.i, 'widget data:', widget, 'type:', widget?.type)}
                                {console.log('DashboardGrid - onOpenContactProfile prop:', onOpenContactProfile)}
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
                                    onOpenUserProfile={onOpenUserProfile}
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
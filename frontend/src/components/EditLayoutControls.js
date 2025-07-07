import React from 'react';

const EditLayoutControls = ({ 
    isEditMode, 
    layout, 
    onDebugRemoveWidget,
    onAddWidget,
    onUpdateView,
    onCancelEdit,
    onSaveAsNewView,
    currentViewId
}) => {
    return (
        <>
            {/* Edit mode indicator and controls */}
            {isEditMode && (
                <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-blue-800 font-medium">
                            🎯 Edit Mode Active - You can now drag, resize, and remove widgets. Click the red X to remove widgets.
                        </p>
                    </div>
                    
                    {/* Edit controls */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onAddWidget}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <span>Add Widget</span>
                        </button>
                        
                        <button
                            onClick={onUpdateView}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            disabled={!currentViewId}
                        >
                            Save Changes
                        </button>
                        
                        <button
                            onClick={onCancelEdit}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        
                        <button
                            onClick={onSaveAsNewView}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                        >
                            Save as New View
                        </button>
                        
                        {/* Debug button - only show if there are widgets */}
                        {layout.length > 0 && (
                            <button 
                                onClick={() => onDebugRemoveWidget(layout[0].i)}
                                className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                                Debug: Remove First Widget
                            </button>
                        )}
                    </div>
                    
                    {/* Instructions */}
                    <div className="mt-3 text-sm text-blue-700">
                        <p>• Drag widgets to reposition them</p>
                        <p>• Use the resize handle (bottom-right corner) to resize widgets</p>
                        <p>• Click the red X button to remove widgets</p>
                        <p>• Use "Add Widget" to add new widgets to the layout</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default EditLayoutControls; 
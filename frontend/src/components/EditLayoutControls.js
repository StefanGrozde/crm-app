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
            {/* Edit mode indicator */}
            {isEditMode && (
                <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                    <p className="text-blue-800 font-medium">
                        🎯 Edit Mode Active - You can now drag, resize, and remove widgets. Click the red X to remove widgets.
                    </p>
                    {layout.length > 0 && (
                        <button 
                            onClick={() => onDebugRemoveWidget(layout[0].i)}
                            className="mt-2 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                            Debug: Remove First Widget
                        </button>
                    )}
                </div>
            )}
        </>
    );
};

export default EditLayoutControls; 
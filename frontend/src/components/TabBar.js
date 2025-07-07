import React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// SortableTab component for draggable tabs
function SortableTab({ id, children, ...props }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        zIndex: isDragging ? 100 : 'auto',
    };
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} {...props}>
            {children}
        </div>
    );
}

const TabBar = ({ 
    openTabs, 
    activeTabId, 
    onSwitchTab, 
    onCloseTab, 
    onTabDragEnd, 
    onTabDragStart,
    isDraggingTab 
}) => {
    // DnD-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    return (
        <>
            <style>
                {`
                    .tab-close-button {
                        opacity: 0;
                        transition: opacity 0.2s;
                    }
                    .tab:hover .tab-close-button {
                        opacity: 1;
                    }
                `}
            </style>
            
            {openTabs.length > 0 && (
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onTabDragEnd} onDragStart={onTabDragStart}>
                            <SortableContext items={openTabs.map(tab => tab.id)} strategy={horizontalListSortingStrategy}>
                                <div className="flex space-x-1 overflow-x-auto justify-start">
                                    {openTabs.map((tab) => (
                                        <SortableTab key={tab.id} id={tab.id}>
                                            <div
                                                className={`tab flex items-center space-x-2 px-4 py-2 border-b-2 cursor-pointer whitespace-nowrap ${
                                                    activeTabId === tab.id
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                                onClick={() => { if (!isDraggingTab) onSwitchTab(tab.id); }}
                                            >
                                                <span className="text-sm font-medium">{tab.name}</span>
                                                {tab.isDefault && (
                                                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                                <button
                                                    className="tab-close-button ml-1 text-gray-400 hover:text-gray-600"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCloseTab(tab.id);
                                                    }}
                                                    title="Close tab"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </SortableTab>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </div>
            )}
        </>
    );
};

export default TabBar; 
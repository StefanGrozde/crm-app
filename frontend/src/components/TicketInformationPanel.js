import React from 'react';

/**
 * TicketInformationPanel Component
 * Reusable component for displaying ticket information in a green panel
 * Extracted from TimelineWithComments for use in TicketProfileWidget
 */
const TicketInformationPanel = ({ ticket }) => {
  if (!ticket) {
    return (
      <div className="bg-teal-700 text-white p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
        <div className="text-center text-teal-100">
          Loading ticket information...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-teal-700 text-white p-6 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-teal-100 mb-1">Case Number</div>
            <div className="font-medium">{ticket.ticketNumber || ticket.id}</div>
          </div>
        </div>
        
        <div>
          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-teal-100 mb-1">Case Owner</div>
            <div className="font-medium">{ticket.assignedUser?.username || 'Unassigned'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-teal-100 mb-1">Status</div>
            <div className="font-medium">{ticket.status || 'Open'}</div>
          </div>
        </div>
        
        <div>
          <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
            <div className="text-xs text-teal-100 mb-1">Priority</div>
            <div className="font-medium">{ticket.priority || 'Medium'}</div>
          </div>
        </div>
      </div>

      <div className="bg-white bg-opacity-20 rounded px-3 py-2 mb-3">
        <div className="text-xs text-teal-100 mb-1">Subject</div>
        <div className="font-medium">{ticket.title || ticket.subject || 'No subject'}</div>
      </div>

      <div className="bg-white bg-opacity-20 rounded px-3 py-2">
        <div className="text-xs text-teal-100 mb-1">Description</div>
        <div className="text-sm">{ticket.description || 'No description'}</div>
      </div>
    </div>
  );
};

export default TicketInformationPanel; 
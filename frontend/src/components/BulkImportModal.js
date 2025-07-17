import React, { useState, useContext } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import BulkImportFileUpload from './BulkImportFileUpload';
import FieldMappingStep from './FieldMappingStep';
import ImportProgressModal from './ImportProgressModal';
import ImportResultsModal from './ImportResultsModal';

const BulkImportModal = ({ isOpen, onClose, onImportComplete }) => {
  const { user } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [importData, setImportData] = useState(null);
  const [activeImportId, setActiveImportId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [resultsData, setResultsData] = useState(null);

  // Step management
  const steps = [
    { id: 1, title: 'Upload File', icon: Upload },
    { id: 2, title: 'Map Fields', icon: FileText },
    { id: 3, title: 'Import', icon: CheckCircle }
  ];

  const handleFileUpload = (uploadResult) => {
    setImportData(uploadResult);
    setCurrentStep(2);
  };

  const handleFieldMapping = async (mappingData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/bulk-import/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: importData.fileInfo.fileName,
          originalFileName: importData.fileInfo.originalName,
          filePath: importData.fileInfo.path,
          fileSize: importData.fileInfo.size,
          fieldMappings: mappingData.fieldMappings,
          duplicateHandling: mappingData.duplicateHandling,
          configuration: mappingData.configuration
        })
      });

      const result = await response.json();

      if (result.success) {
        setActiveImportId(result.data.importId);
        setCurrentStep(3);
        setShowProgress(true);
      } else {
        throw new Error(result.message || 'Failed to start import');
      }
    } catch (error) {
      console.error('Error starting import:', error);
      alert('Failed to start import: ' + error.message);
    }
  };

  const handleImportComplete = (importResults) => {
    setShowProgress(false);
    setResultsData(importResults);
    setShowResults(true);
    
    // Notify parent component
    if (onImportComplete) {
      onImportComplete(importResults);
    }
  };

  const handleCloseModal = () => {
    // Reset state
    setCurrentStep(1);
    setImportData(null);
    setActiveImportId(null);
    setShowProgress(false);
    setShowResults(false);
    setResultsData(null);
    onClose();
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getStepIcon = (step) => {
    const IconComponent = step.icon;
    return <IconComponent size={16} />;
  };

  const getStepStatus = (stepId) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Bulk Import Contacts</h2>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Progress Steps */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      getStepStatus(step.id) === 'completed' 
                        ? 'bg-green-500 border-green-500' 
                        : getStepStatus(step.id) === 'active'
                        ? 'bg-white border-white text-blue-600'
                        : 'border-blue-300 text-blue-300'
                    }`}>
                      {getStepStatus(step.id) === 'completed' ? (
                        <CheckCircle size={16} />
                      ) : (
                        getStepIcon(step)
                      )}
                    </div>
                    <span className={`ml-3 font-medium ${
                      getStepStatus(step.id) === 'pending' ? 'text-blue-300' : 'text-white'
                    }`}>
                      {step.title}
                    </span>
                    {index < steps.length - 1 && (
                      <ArrowRight size={16} className="mx-4 text-blue-300" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {currentStep === 1 && (
              <BulkImportFileUpload onUploadComplete={handleFileUpload} />
            )}
            
            {currentStep === 2 && importData && (
              <FieldMappingStep
                importData={importData}
                onMappingComplete={handleFieldMapping}
                onPrevious={handlePreviousStep}
              />
            )}
            
            {currentStep === 3 && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Starting import process...</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {currentStep === 1 && "Upload a CSV or Excel file to begin"}
                {currentStep === 2 && "Map your file columns to contact fields"}
                {currentStep === 3 && "Processing your import..."}
              </div>
              <div className="flex space-x-3">
                {currentStep > 1 && currentStep < 3 && (
                  <button
                    onClick={handlePreviousStep}
                    className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                  >
                    Previous
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgress && activeImportId && (
        <ImportProgressModal
          isOpen={showProgress}
          importId={activeImportId}
          onComplete={handleImportComplete}
          onClose={() => setShowProgress(false)}
        />
      )}

      {/* Results Modal */}
      {showResults && resultsData && (
        <ImportResultsModal
          isOpen={showResults}
          resultsData={resultsData}
          onClose={() => setShowResults(false)}
        />
      )}
    </>
  );
};

export default BulkImportModal;
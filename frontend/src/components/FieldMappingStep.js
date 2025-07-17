import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, CheckCircle, Info, Settings } from 'lucide-react';

const FieldMappingStep = ({ importData, onMappingComplete, onPrevious }) => {
  const [fieldMappings, setFieldMappings] = useState({});
  const [duplicateHandling, setDuplicateHandling] = useState('skip');
  const [errors, setErrors] = useState([]);
  const [previewData, setPreviewData] = useState([]);

  // Available CRM fields
  const crmFields = [
    { key: 'firstName', label: 'First Name', required: false },
    { key: 'lastName', label: 'Last Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone', label: 'Phone', required: false },
    { key: 'mobile', label: 'Mobile', required: false },
    { key: 'jobTitle', label: 'Job Title', required: false },
    { key: 'company', label: 'Company', required: false },
    { key: 'department', label: 'Department', required: false },
    { key: 'address', label: 'Address', required: false },
    { key: 'city', label: 'City', required: false },
    { key: 'state', label: 'State', required: false },
    { key: 'zipCode', label: 'ZIP Code', required: false },
    { key: 'country', label: 'Country', required: false },
    { key: 'notes', label: 'Notes', required: false },
    { key: 'tags', label: 'Tags', required: false },
    { key: 'status', label: 'Status', required: false },
    { key: 'source', label: 'Source', required: false }
  ];

  const duplicateOptions = [
    { value: 'skip', label: 'Skip duplicates', description: 'Leave existing contacts unchanged' },
    { value: 'update', label: 'Update duplicates', description: 'Replace existing data with new data' },
    { value: 'merge', label: 'Merge duplicates', description: 'Fill empty fields, keep existing data' }
  ];

  useEffect(() => {
    if (importData?.mappings?.suggested) {
      setFieldMappings(importData.mappings.suggested);
    }
    if (importData?.preview?.data) {
      setPreviewData(importData.preview.data.slice(0, 5));
    }
  }, [importData]);

  const handleFieldMappingChange = (fileField, crmField) => {
    setFieldMappings(prev => ({
      ...prev,
      [fileField]: crmField
    }));
  };

  const validateMappings = () => {
    const newErrors = [];
    
    // Check if at least one identifier field is mapped
    const identifierFields = ['firstName', 'lastName', 'email'];
    const mappedValues = Object.values(fieldMappings);
    const hasIdentifier = identifierFields.some(field => mappedValues.includes(field));
    
    if (!hasIdentifier) {
      newErrors.push('At least one identifier field (First Name, Last Name, or Email) must be mapped.');
    }
    
    // Check for duplicate mappings
    const duplicateMappings = {};
    Object.entries(fieldMappings).forEach(([fileField, crmField]) => {
      if (crmField && crmField !== 'ignore') {
        if (duplicateMappings[crmField]) {
          newErrors.push(`Field "${crmField}" is mapped to multiple file columns.`);
        } else {
          duplicateMappings[crmField] = fileField;
        }
      }
    });
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleContinue = () => {
    if (validateMappings()) {
      const mappingData = {
        fieldMappings: fieldMappings,
        duplicateHandling: duplicateHandling,
        configuration: {
          validateEmails: true,
          validatePhones: true,
          generateStats: true
        }
      };
      
      onMappingComplete(mappingData);
    }
  };

  const getMappingStatus = () => {
    const mappedFields = Object.values(fieldMappings).filter(field => field && field !== 'ignore');
    const totalFields = importData?.preview?.headers?.length || 0;
    return {
      mapped: mappedFields.length,
      total: totalFields,
      percentage: totalFields > 0 ? Math.round((mappedFields.length / totalFields) * 100) : 0
    };
  };

  const getPreviewValue = (row, fieldName) => {
    const value = row[fieldName];
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">empty</span>;
    }
    return String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '');
  };

  const status = getMappingStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Your Data Fields</h3>
        <p className="text-sm text-gray-600">
          Match your file columns to CRM contact fields. Fields marked as "Ignore" will not be imported.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-blue-900">Field Mapping Progress</span>
          <span className="text-sm text-blue-700">{status.mapped} of {status.total} fields mapped</span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${status.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center mb-2">
            <AlertCircle className="text-red-500 mr-2" size={16} />
            <span className="text-sm font-medium text-red-800">Please fix the following issues:</span>
          </div>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Field Mapping Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
            <div className="col-span-3">File Column</div>
            <div className="col-span-1 text-center">→</div>
            <div className="col-span-3">CRM Field</div>
            <div className="col-span-5">Sample Data</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {importData?.preview?.headers?.map((header, index) => (
            <div key={index} className="px-4 py-3">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* File Column */}
                <div className="col-span-3">
                  <div className="font-medium text-gray-900">{header}</div>
                  <div className="text-xs text-gray-500">
                    Column {index + 1}
                  </div>
                </div>

                {/* Arrow */}
                <div className="col-span-1 text-center">
                  <ArrowRight className="text-gray-400 mx-auto" size={16} />
                </div>

                {/* CRM Field Mapping */}
                <div className="col-span-3">
                  <select
                    value={fieldMappings[header] || ''}
                    onChange={(e) => handleFieldMappingChange(header, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select field...</option>
                    <option value="ignore">Ignore this column</option>
                    {crmFields.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sample Data */}
                <div className="col-span-5">
                  <div className="text-sm text-gray-700 space-y-1">
                    {previewData.slice(0, 3).map((row, rowIndex) => (
                      <div key={rowIndex} className="truncate">
                        {getPreviewValue(row, header)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duplicate Handling */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Settings className="text-gray-600 mr-2" size={16} />
          <h4 className="font-medium text-gray-900">Duplicate Handling</h4>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Choose how to handle contacts that already exist in your CRM (matched by email or name).
        </p>
        
        <div className="space-y-3">
          {duplicateOptions.map(option => (
            <div key={option.value} className="flex items-start">
              <input
                type="radio"
                id={option.value}
                name="duplicateHandling"
                value={option.value}
                checked={duplicateHandling === option.value}
                onChange={(e) => setDuplicateHandling(e.target.value)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
              />
              <div className="ml-3">
                <label htmlFor={option.value} className="text-sm font-medium text-gray-900">
                  {option.label}
                </label>
                <p className="text-sm text-gray-500">{option.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center mb-3">
          <Info className="text-gray-600 mr-2" size={16} />
          <h4 className="font-medium text-gray-900">Data Preview</h4>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Preview of how your data will be imported (first 5 rows shown).
        </p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {Object.entries(fieldMappings)
                  .filter(([_, crmField]) => crmField && crmField !== 'ignore')
                  .map(([fileField, crmField]) => (
                    <th key={fileField} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {crmFields.find(f => f.key === crmField)?.label || crmField}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.entries(fieldMappings)
                    .filter(([_, crmField]) => crmField && crmField !== 'ignore')
                    .map(([fileField, crmField]) => (
                      <td key={fileField} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                        {getPreviewValue(row, fileField)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
        >
          Previous
        </button>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          disabled={errors.length > 0}
        >
          Start Import
        </button>
      </div>
    </div>
  );
};

export default FieldMappingStep;
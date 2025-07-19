const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const { createReadStream } = require('fs');

class FileProcessingService {
  static SUPPORTED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  static MAX_ROWS = 10000;

  /**
   * Process uploaded file and extract contacts data
   * @param {string} filePath - Path to uploaded file
   * @param {string} originalName - Original filename
   * @returns {Promise<Object>} Processing result with contacts data
   */
  static async processFile(filePath, originalName) {
    try {
      console.log(`📁 Processing file: ${originalName}`);
      
      // Validate file
      await this.validateFile(filePath, originalName);
      
      // Process based on file type
      const extension = path.extname(originalName).toLowerCase();
      let result;
      
      switch (extension) {
        case '.csv':
          result = await this.processCSV(filePath);
          break;
        case '.xlsx':
        case '.xls':
          result = await this.processExcel(filePath);
          break;
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }
      
      console.log(`✅ File processed successfully: ${result.totalRows} rows extracted`);
      return result;
      
    } catch (error) {
      console.error(`❌ File processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate uploaded file
   * @param {string} filePath - Path to file
   * @param {string} originalName - Original filename
   * @returns {Promise<void>}
   */
  static async validateFile(filePath, originalName) {
    const extension = path.extname(originalName).toLowerCase();
    
    // Check file type
    if (!this.SUPPORTED_FILE_TYPES.includes(extension)) {
      throw new Error(`Unsupported file type. Supported types: ${this.SUPPORTED_FILE_TYPES.join(', ')}`);
    }
    
    // Check file exists
    try {
      await fs.access(filePath);
    } catch {
      throw new Error('File not found or not accessible');
    }
    
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`File too large. Maximum size: ${this.MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }
    
    console.log(`✅ File validation passed: ${originalName} (${stats.size} bytes)`);
  }

  /**
   * Process CSV file
   * @param {string} filePath - Path to CSV file
   * @returns {Promise<Object>} Processing result
   */
  static async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const contacts = [];
      const errors = [];
      let headers = [];
      let currentRow = 0;

      const stream = createReadStream(filePath)
        .pipe(csv())
        .on('headers', (headerList) => {
          headers = headerList;
          console.log(`📋 CSV Headers detected: ${headers.join(', ')}`);
        })
        .on('data', (row) => {
          currentRow++;
          
          // Check row limit
          if (currentRow > this.MAX_ROWS) {
            stream.destroy();
            reject(new Error(`File contains too many rows. Maximum allowed: ${this.MAX_ROWS}`));
            return;
          }
          
          try {
            const processedRow = this.processRow(row, currentRow, headers);
            contacts.push(processedRow);
          } catch (error) {
            errors.push({
              row: currentRow,
              error: error.message,
              data: row
            });
          }
        })
        .on('end', () => {
          resolve({
            type: 'csv',
            headers,
            contacts,
            errors,
            totalRows: currentRow,
            successRows: contacts.length,
            errorRows: errors.length
          });
        })
        .on('error', reject);
    });
  }

  /**
   * Process Excel file
   * @param {string} filePath - Path to Excel file
   * @returns {Promise<Object>} Processing result
   */
  static async processExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    
    // Use first worksheet
    const worksheet = workbook.getWorksheet(1);
    
    if (!worksheet) {
      throw new Error('No worksheet found in Excel file');
    }
    
    const contacts = [];
    const errors = [];
    let headers = [];
    let currentRow = 0;
    
    // Process rows
    worksheet.eachRow((row, rowNumber) => {
      currentRow = rowNumber;
      
      // Check row limit
      if (currentRow > this.MAX_ROWS) {
        throw new Error(`File contains too many rows. Maximum allowed: ${this.MAX_ROWS}`);
      }
      
      if (rowNumber === 1) {
        // Extract headers from first row
        headers = row.values.slice(1); // Remove first empty cell
        console.log(`📋 Excel Headers detected: ${headers.join(', ')}`);
        return;
      }
      
      try {
        // Convert row to object
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const headerIndex = colNumber - 1;
          if (headers[headerIndex]) {
            rowData[headers[headerIndex]] = cell.value;
          }
        });
        
        const processedRow = this.processRow(rowData, rowNumber, headers);
        contacts.push(processedRow);
      } catch (error) {
        errors.push({
          row: rowNumber,
          error: error.message,
          data: row.values
        });
      }
    });
    
    return {
      type: 'excel',
      headers,
      contacts,
      errors,
      totalRows: currentRow - 1, // Subtract header row
      successRows: contacts.length,
      errorRows: errors.length
    };
  }

  /**
   * Process individual row data
   * @param {Object} rowData - Raw row data
   * @param {number} rowNumber - Row number for error reporting
   * @param {Array} headers - Available headers
   * @returns {Object} Processed contact data
   */
  static processRow(rowData, rowNumber, headers) {
    const contact = {
      rowNumber,
      originalData: { ...rowData }
    };
    
    // Map common field variations to standard field names
    const fieldMapping = {
      // First Name variations
      'first_name': 'firstName',
      'firstname': 'firstName',
      'first name': 'firstName',
      'fname': 'firstName',
      'given_name': 'firstName',
      
      // Last Name variations  
      'last_name': 'lastName',
      'lastname': 'lastName',
      'last name': 'lastName',
      'lname': 'lastName',
      'surname': 'lastName',
      'family_name': 'lastName',
      
      // Email variations
      'email': 'email',
      'email_address': 'email',
      'e-mail': 'email',
      'mail': 'email',
      
      // Phone variations
      'phone': 'phone',
      'phone_number': 'phone',
      'telephone': 'phone',
      'tel': 'phone',
      'primary_phone': 'phone',
      
      // Mobile variations
      'mobile': 'mobile',
      'mobile_phone': 'mobile',
      'cell': 'mobile',
      'cellphone': 'mobile',
      'cell_phone': 'mobile',
      
      // Job Title variations
      'job_title': 'jobTitle',
      'title': 'jobTitle',
      'position': 'jobTitle',
      'role': 'jobTitle',
      
      // Company variations
      'company': 'company',
      'organization': 'company',
      'employer': 'company',
      'company_name': 'company',
      
      // Department variations
      'department': 'department',
      'dept': 'department',
      'division': 'department',
      
      // Address variations
      'address': 'address',
      'street': 'address',
      'street_address': 'address',
      'address_line_1': 'address',
      
      // City variations
      'city': 'city',
      'town': 'city',
      'locality': 'city',
      
      // State variations
      'state': 'state',
      'province': 'state',
      'region': 'state',
      
      // ZIP variations
      'zip': 'zipCode',
      'zip_code': 'zipCode',
      'postal_code': 'zipCode',
      'postcode': 'zipCode',
      
      // Country variations
      'country': 'country',
      'nation': 'country',
      
      // Notes variations
      'notes': 'notes',
      'note': 'notes',
      'comments': 'notes',
      'description': 'notes',
      
      // Tags variations
      'tags': 'tags',
      'tag': 'tags',
      'categories': 'tags',
      'labels': 'tags',
      
      // Status variations
      'status': 'status',
      'state': 'status',
      'active': 'status',
      
      // Source variations
      'source': 'source',
      'lead_source': 'source',
      'origin': 'source'
    };
    
    // Map fields from row data
    for (const [key, value] of Object.entries(rowData)) {
      if (value !== null && value !== undefined && value !== '') {
        const normalizedKey = key.toLowerCase().trim();
        const mappedField = fieldMapping[normalizedKey] || normalizedKey;
        
        // Clean and process the value
        contact[mappedField] = this.cleanFieldValue(value, mappedField);
      }
    }
    
    // Validate required fields
    if (!contact.firstName && !contact.lastName && !contact.email) {
      throw new Error('Row must contain at least firstName, lastName, or email');
    }
    
    return contact;
  }

  /**
   * Clean and validate field value
   * @param {*} value - Raw field value
   * @param {string} fieldName - Field name for context
   * @returns {string} Cleaned value
   */
  static cleanFieldValue(value, fieldName) {
    // Convert to string and trim
    let cleanValue = String(value).trim();
    
    // Handle specific field types
    switch (fieldName) {
      case 'email':
        cleanValue = cleanValue.toLowerCase();
        break;
      case 'phone':
      case 'mobile':
        // Remove common phone formatting
        cleanValue = cleanValue.replace(/[^\d+()-.\s]/g, '');
        break;
      case 'tags':
        // Handle comma-separated tags, ensure always returns array
        if (cleanValue.includes(',')) {
          cleanValue = cleanValue.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
          // Single tag - convert to array
          cleanValue = [cleanValue.trim()].filter(tag => tag);
        }
        break;
      case 'zipCode':
        // Remove spaces from zip codes
        cleanValue = cleanValue.replace(/\s/g, '');
        break;
      default:
        // General text cleaning
        cleanValue = cleanValue.replace(/\s+/g, ' '); // Normalize whitespace
        break;
    }
    
    return cleanValue;
  }

  /**
   * Generate field mapping suggestions
   * @param {Array} headers - Detected headers
   * @returns {Object} Suggested field mappings
   */
  static generateFieldMappings(headers) {
    const mappings = {};
    const standardFields = [
      'firstName', 'lastName', 'email', 'phone', 'mobile', 'jobTitle',
      'company', 'department', 'address', 'city', 'state', 'zipCode',
      'country', 'notes', 'tags', 'status', 'source'
    ];
    
    headers.forEach(header => {
      const normalizedHeader = header.toLowerCase().trim();
      
      // Find best match for standard fields
      const bestMatch = standardFields.find(field => {
        const fieldLower = field.toLowerCase();
        return (
          normalizedHeader === fieldLower ||
          normalizedHeader.includes(fieldLower) ||
          fieldLower.includes(normalizedHeader)
        );
      });
      
      if (bestMatch) {
        mappings[header] = bestMatch;
      }
    });
    
    return mappings;
  }

  /**
   * Validate contact data structure
   * @param {Object} contact - Contact data to validate
   * @returns {Object} Validation result
   */
  static validateContactData(contact) {
    const errors = [];
    const warnings = [];
    
    // Required field validation
    if (!contact.firstName && !contact.lastName && !contact.email) {
      errors.push('At least one of firstName, lastName, or email is required');
    }
    
    // Email validation
    if (contact.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contact.email)) {
        errors.push('Invalid email format');
      }
    }
    
    // Phone validation
    if (contact.phone) {
      const phoneRegex = /^[\d+()-.\s]+$/;
      if (!phoneRegex.test(contact.phone)) {
        warnings.push('Phone number format may be invalid');
      }
    }
    
    // Length validations
    const maxLengths = {
      firstName: 50,
      lastName: 50,
      email: 255,
      phone: 20,
      mobile: 20,
      jobTitle: 100,
      company: 255,
      department: 100,
      address: 255,
      city: 100,
      state: 100,
      zipCode: 20,
      country: 100
    };
    
    for (const [field, maxLength] of Object.entries(maxLengths)) {
      if (contact[field] && contact[field].length > maxLength) {
        errors.push(`${field} exceeds maximum length of ${maxLength} characters`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get file processing statistics
   * @param {Object} result - Processing result
   * @returns {Object} Statistics summary
   */
  static getProcessingStats(result) {
    const stats = {
      totalRows: result.totalRows,
      successRows: result.successRows,
      errorRows: result.errorRows,
      successRate: result.totalRows > 0 ? Math.round((result.successRows / result.totalRows) * 100) : 0,
      errorRate: result.totalRows > 0 ? Math.round((result.errorRows / result.totalRows) * 100) : 0,
      fileType: result.type,
      detectedFields: result.headers.length,
      mappedFields: Object.keys(this.generateFieldMappings(result.headers)).length
    };
    
    return stats;
  }
}

module.exports = FileProcessingService;
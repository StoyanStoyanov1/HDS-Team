import React, { useEffect, useCallback, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ITableColumn } from './interfaces';

interface EditRowModalProps<T> {
  isOpen: boolean;
  item: T;
  columns: ITableColumn<T>[];
  onSave: (updatedItem: T) => void;
  onCancel: () => void;
}

function EditRowModal<T>({
  isOpen,
  item,
  columns,
  onSave,
  onCancel,
}: EditRowModalProps<T>) {
  // Add state to track client-side rendering
  const [isMounted, setIsMounted] = useState(false);
  // State to store the edited values
  const [editedItem, setEditedItem] = useState<T>({ ...item });

  // State to store validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set mounted state when component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update editedItem when item changes
  useEffect(() => {
    setEditedItem({ ...item });
    setErrors({});
  }, [item]);

  // Validate a single field
  const validateField = (columnKey: string, value: any): string => {
    const column = columns.find(col => col.key === columnKey);
    if (!column) return '';

    // Check if field is required
    if (column.required && (value === undefined || value === null || value === '')) {
      return `${column.header} is required`;
    }

    // Check min length for text fields
    if (column.minLength && typeof value === 'string' && value.length < column.minLength) {
      return `${column.header} must be at least ${column.minLength} characters`;
    }

    // Check max length for text fields
    if (column.maxLength && typeof value === 'string' && value.length > column.maxLength) {
      return `${column.header} must be at most ${column.maxLength} characters`;
    }

    // Check pattern for text fields
    if (column.pattern && typeof value === 'string') {
      const pattern = typeof column.pattern === 'string' ? new RegExp(column.pattern) : column.pattern;
      if (!pattern.test(value)) {
        return `${column.header} has an invalid format`;
      }
    }

    // Check custom validation
    if (column.validate) {
      const result = column.validate(value);
      if (typeof result === 'boolean') {
        return result ? '' : `${column.header} is invalid`;
      } else if (!result.isValid) {
        return result.message || `${column.header} is invalid`;
      }
    }

    return '';
  };

  // Validate the entire form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    columns.forEach(column => {
      if (column.key && column.key !== '_actions') {
        const value = (editedItem as any)[column.key];
        const error = validateField(column.key, value);
        if (error) {
          newErrors[column.key] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onCancel();
    }
  }, [isOpen, onCancel]);

  // Add event listener for keyboard shortcuts
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, isOpen]);

  // Don't render anything during SSR or if dialog is closed
  if (!isMounted || !isOpen) return null;

  // Handle input change
  const handleInputChange = (columnKey: string, value: any) => {
    setEditedItem(prev => ({
      ...prev,
      [columnKey]: value
    }));

    // Validate the field on change
    const error = validateField(columnKey, value);
    setErrors(prev => ({
      ...prev,
      [columnKey]: error
    }));
  };

  // Use all columns, not just visible ones
  // const visibleColumns = columns.filter(col => !col.hidden);

  return (
    <div className="fixed inset-0 overflow-y-auto z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-3xl animate-scale-in">
          <div className="px-6 py-5">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Edit Row
                </h3>
              </div>
              <button 
                type="button" 
                className="rounded-md bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                onClick={onCancel}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] overflow-y-auto px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {columns.map((column) => {
                  // Skip columns that don't have a key or are not meant to be displayed
                  if (!column.key || column.key === '_actions') return null;

                  const value = (editedItem as any)[column.key];
                  const error = errors[column.key];
                  const hasError = !!error;

                  return (
                    <div key={column.key} className="mb-4 w-full">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {column.header}
                        {column.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {column.fieldDataType === 'boolean' ? (
                        <select
                          className={`w-full px-3 py-2 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                          value={value ? 'true' : 'false'}
                          onChange={(e) => handleInputChange(column.key, e.target.value === 'true')}
                        >
                          <option value="true">{column.labelTrue || 'Active'}</option>
                          <option value="false">{column.labelFalse || 'Inactive'}</option>
                        </select>
                      ) : column.fieldDataType === 'enum' || column.fieldDataType === 'role' ? (
                        <select
                          className={`w-full px-3 py-2 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                          value={value}
                          onChange={(e) => handleInputChange(column.key, e.target.value)}
                        >
                          {column.filterOptions ? (
                            column.filterOptions.map(option => (
                              <option key={option.id} value={option.value}>
                                {option.label}
                              </option>
                            ))
                          ) : column.getFilterOptions ? (
                            // Use getFilterOptions to generate options from data
                            column.getFilterOptions([item]).map(option => (
                              <option key={option.id} value={option.value}>
                                {option.label}
                              </option>
                            ))
                          ) : column.fieldDataType === 'role' ? (
                            // Default role options if none provided
                            <>
                              <option value="admin">Admin</option>
                              <option value="user">User</option>
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </>
                          ) : (
                            <option value={value}>{value}</option>
                          )}
                        </select>
                      ) : column.fieldDataType === 'date' ? (
                        <input
                          type="date"
                          className={`w-full px-3 py-2 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                          value={value ? new Date(value).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleInputChange(column.key, e.target.value ? new Date(e.target.value) : null)}
                        />
                      ) : (
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${hasError ? 'focus:ring-red-500' : 'focus:ring-indigo-500 dark:focus:ring-indigo-400'}`}
                          value={value || ''}
                          onChange={(e) => handleInputChange(column.key, e.target.value)}
                        />
                      )}

                      {hasError && (
                        <div className="mt-1 text-sm text-red-500 flex items-center">
                          <AlertCircle size={14} className="mr-1" />
                          {error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 dark:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                onClick={() => {
                  if (validateForm()) {
                    onSave(editedItem);
                  }
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default EditRowModal;

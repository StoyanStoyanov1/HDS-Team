'use client';

// This file re-exports the Table component and its related types/interfaces
export { default } from './Table';
export * from './interfaces';
export * from './TableService';
export * from './utils';

// Re-export hooks for external use
export * from './hooks/useTableSelection';
export * from './hooks/useTableFilters';
export * from './hooks/useTableSort';

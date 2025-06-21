
import React from 'react';
import { Filters } from '../types';
import { BANCOS_OPTIONS, PROMOTORAS_OPTIONS } from '../constants';

interface FilterBarProps {
  filters: Filters;
  onFilterChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, onApplyFilters, onClearFilters }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name as keyof Filters, value);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <div className="flex items-center mb-4 pb-2 border-b border-gray-200">
        <i className="fas fa-filter mr-2 text-xl text-primary"></i>
        <h5 className="text-xl font-semibold text-gray-700">Filtros</h5>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onApplyFilters(); }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div>
          <label htmlFor="filter_nome" className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
          <input
            type="text"
            id="filter_nome"
            name="nomeCliente"
            value={filters.nomeCliente}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter_cpf" className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
          <input
            type="text"
            id="filter_cpf"
            name="cpf"
            value={filters.cpf}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="filter_banco" className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
          <select
            id="filter_banco"
            name="banco"
            value={filters.banco}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {BANCOS_OPTIONS.map(banco => (
              <option key={banco} value={banco === "Todos" ? "" : banco}>{banco}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter_promotora" className="block text-sm font-medium text-gray-700 mb-1">Promotora</label>
          <select
            id="filter_promotora"
            name="promotora"
            value={filters.promotora}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {PROMOTORAS_OPTIONS.map(promotora => (
              <option key={promotora} value={promotora === "Todas" ? "" : promotora}>{promotora}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end space-x-2 xl:col-span-1">
          <button 
            type="submit" 
            className="w-full sm:w-auto flex-grow bg-primary hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm flex items-center justify-center"
          >
            <i className="fas fa-search mr-2"></i> Filtrar
          </button>
          <button 
            type="button" 
            onClick={onClearFilters}
            className="w-full sm:w-auto flex-grow bg-secondary hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm flex items-center justify-center"
          >
            <i className="fas fa-undo mr-2"></i> Limpar
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
    
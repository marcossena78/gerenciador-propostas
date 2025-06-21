
import React, { useState, useRef, useEffect } from 'react';

const ExportDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const exportToExcel = () => {
    alert('Funcionalidade de exportar para Excel ainda não implementada.');
    setIsOpen(false);
  };

  const exportToPDF = () => {
    alert('Funcionalidade de exportar para PDF ainda não implementada.');
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="fixed bottom-4 end-4 z-40" ref={dropdownRef}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-secondary hover:bg-gray-700 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center text-sm"
        >
          <i className="fas fa-download mr-2"></i> Exportar
          <i className={`fas fa-chevron-up ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-0' : 'rotate-180'}`}></i>
        </button>
        {isOpen && (
          <ul className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); exportToExcel(); }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <i className="fas fa-file-excel mr-3 text-green-500"></i>Excel
              </a>
            </li>
            <li>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); exportToPDF(); }}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <i className="fas fa-file-pdf mr-3 text-red-500"></i>PDF
              </a>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

export default ExportDropdown;
    
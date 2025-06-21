
import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="bg-primary text-white py-4 shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            <i className="fas fa-file-invoice-dollar mr-2"></i>
            Gerenciador de Propostas Souzacred
          </h1>
          <img 
            src="https://picsum.photos/150/50?random=logo" // Placeholder logo
            alt="Logo" 
            className="h-12" // Adjusted height
            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150x50?text=Logo')} // Fallback
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
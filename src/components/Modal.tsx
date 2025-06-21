
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  titleIcon?: string; 
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md', titleIcon }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300 ease-in-out">
      <div className={`bg-white rounded-lg shadow-xl transform transition-all duration-300 ease-in-out w-full m-4 ${sizeClasses[size]}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-primary text-white rounded-t-lg">
          <h5 className="text-lg font-semibold">
            {titleIcon && <i className={`${titleIcon} mr-2`}></i>}
            {title}
          </h5>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end p-4 border-t border-gray-200 space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
    
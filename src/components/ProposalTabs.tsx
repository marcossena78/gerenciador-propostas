
import React from 'react';
import { Proposal } from '../types';
import { slugify } from '../utils/formatting';
import { INITIAL_SHEET_NAMES } from '../constants';


interface ProposalTabsProps {
  sheetNames: string[];
  activeSheetName: string;
  onTabChange: (sheetName: string) => void;
  getProposalsForSheet: (sheetName: string) => Proposal[];
}

const ProposalTabs: React.FC<ProposalTabsProps> = ({ sheetNames, activeSheetName, onTabChange, getProposalsForSheet }) => {
  return (
    <div className="mb-0"> {/* Adjusted margin from mb-3 to mb-0 */}
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200" role="tablist">
        {sheetNames.map((sheetName) => {
          const isActive = sheetName === activeSheetName;
          const proposalCount = getProposalsForSheet(sheetName).length;
          return (
            <li key={sheetName} className="mr-2" role="presentation">
              <button
                className={`inline-flex items-center px-4 py-3 rounded-t-lg group ${
                  isActive
                    ? 'text-primary bg-gray-50 border-primary border-b-2 font-semibold'
                    : 'hover:text-gray-700 hover:bg-gray-100 border-transparent'
                }`}
                id={`${slugify(sheetName)}-tab`}
                type="button"
                role="tab"
                aria-controls={slugify(sheetName)}
                aria-selected={isActive}
                onClick={() => onTabChange(sheetName)}
              >
                {sheetName}
                <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
                }`}>
                  {proposalCount}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProposalTabs;
    
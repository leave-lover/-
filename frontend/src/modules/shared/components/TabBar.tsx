import React from 'react';
import './TabBar.css';

interface Tab {
  id: string;
  label: string;
  isActive: boolean;
  isClosable?: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
}

const TabBar: React.FC<TabBarProps> = ({ tabs, onTabChange, onTabClose }) => {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div key={tab.id} className="tab-item-container">
          <button
            className={`tab-button ${tab.isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
          {tab.isClosable && onTabClose && (
            <button
              className="tab-close-button"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              aria-label="关闭标签"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default TabBar;

import React, { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import { Navigate } from 'react-router-dom';
import { UsersTab } from './tabs/UsersTab';
import { BuildingsTab } from './tabs/BuildingsTab';
import { ApartmentsTab } from './tabs/ApartmentsTab';
import { ExpenseCategoriesTab } from './tabs/ExpenseCategoriesTab';

type TabType = 'users' | 'buildings' | 'apartments' | 'categories';

export const ConfigurationPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('buildings');

  // Only SUPER_ADMIN can access this page
  if (!hasRole([UserRole.SUPER_ADMIN])) {
    return <Navigate to="/dashboard" replace />;
  }

  const tabs = [
    { id: 'buildings' as TabType, name: 'Κτίρια', icon: '🏢' },
    { id: 'apartments' as TabType, name: 'Διαμερίσματα', icon: '🏠' },
    { id: 'users' as TabType, name: 'Χρήστες', icon: '👥' },
    { id: 'categories' as TabType, name: 'Κατηγορίες Εξόδων', icon: '📂' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ρυθμίσεις</h1>
        <p className="text-gray-600 mt-1">Διαχείριση συστήματος και ρυθμίσεις εφαρμογής</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'buildings' && <BuildingsTab />}
        {activeTab === 'apartments' && <ApartmentsTab />}
        {activeTab === 'categories' && <ExpenseCategoriesTab />}
      </div>
    </div>
  );
};

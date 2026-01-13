import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';

export const AppLayout: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canWrite = hasRole([UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Έξοδα', path: '/expenses', icon: '💰' },
    { name: 'Κοινόχρηστα', path: '/common-charges', icon: '🧾' },
    { name: 'Πληρωμές', path: '/payments', icon: '💳', hidden: !canWrite },
    { name: 'Έγγραφα', path: '/documents', icon: '📄' },
    { name: 'Ανακοινώσεις', path: '/announcements', icon: '📢' },
  ].filter(item => !item.hidden);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary-900">
                  Building Manager
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                {navigation.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.role === UserRole.SUPER_ADMIN && 'Super Admin'}
                  {user?.role === UserRole.BUILDING_ADMIN && 'Building Admin'}
                  {user?.role === UserRole.READ_ONLY && 'Read Only'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Έξοδος
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className="sm:hidden border-t border-gray-200">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block pl-3 pr-4 py-2 text-base font-medium ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                  }`
                }
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

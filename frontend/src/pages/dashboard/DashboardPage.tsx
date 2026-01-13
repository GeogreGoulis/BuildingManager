import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { buildingsApi, apartmentsApi, expensesApi } from '../../services/endpoints';
import { UserRole } from '../../types';

export const DashboardPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = hasRole([UserRole.SUPER_ADMIN]);

  // Fetch buildings
  const { data: buildings = [], isLoading: loadingBuildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingsApi.getAll,
  });

  // Get the building ID (for building admins use their assigned building)
  const buildingId = isSuperAdmin 
    ? (buildings.length > 0 ? buildings[0].id : '') 
    : (user?.buildingId || '');

  // Fetch apartments
  const { data: apartments = [], isLoading: loadingApartments } = useQuery({
    queryKey: ['apartments', buildingId],
    queryFn: () => apartmentsApi.getAll(buildingId || undefined),
    enabled: !!buildingId || isSuperAdmin,
  });

  // Fetch expenses for the current month
  const { data: expensesData, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses', buildingId],
    queryFn: () => expensesApi.getAll(buildingId, { page: 1, limit: 100 }),
    enabled: !!buildingId,
  });

  const expenses = expensesData?.data || [];

  // Calculate stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthExpenses = expenses.filter((exp: any) => {
    const expDate = new Date(exp.expenseDate);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });

  const totalMonthlyExpenses = currentMonthExpenses.reduce(
    (sum: number, exp: any) => sum + Number(exp.amount), 
    0
  );

  const unpaidExpenses = expenses.filter((exp: any) => !exp.isPaid);
  const totalUnpaid = unpaidExpenses.reduce(
    (sum: number, exp: any) => sum + Number(exp.amount), 
    0
  );

  const paidExpenses = expenses.filter((exp: any) => exp.isPaid);
  const collectionRate = expenses.length > 0 
    ? Math.round((paidExpenses.length / expenses.length) * 100) 
    : 0;

  const totalApartments = isSuperAdmin 
    ? apartments.length 
    : apartments.filter((apt: any) => apt.buildingId === buildingId).length;

  const totalBuildings = buildings.length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('el-GR');
  };

  const currentPeriod = new Date().toLocaleDateString('el-GR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const isLoading = loadingBuildings || loadingApartments || loadingExpenses;

  // Recent expenses (last 5)
  const recentExpenses = [...expenses]
    .sort((a: any, b: any) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Καλώς ήρθατε, {user?.firstName}!
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Τρέχουσα Περίοδος</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">{currentPeriod}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Έξοδα Τρέχοντος Μήνα</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalMonthlyExpenses)}</p>
          <p className="text-xs text-gray-500 mt-1">{currentMonthExpenses.length} καταχωρήσεις</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Απλήρωτα Έξοδα</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUnpaid)}</p>
          <p className="text-xs text-gray-500 mt-1">{unpaidExpenses.length} εκκρεμή</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🏢</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">
            {isSuperAdmin ? 'Πολυκατοικίες' : 'Διαμερίσματα'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {isSuperAdmin ? totalBuildings : totalApartments}
          </p>
          {isSuperAdmin && (
            <p className="text-xs text-gray-500 mt-1">{totalApartments} διαμερίσματα συνολικά</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">📊</span>
          </div>
          <p className="text-gray-600 text-sm mb-1">Ποσοστό Πληρωμών</p>
          <p className="text-2xl font-bold text-gray-900">{collectionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">{paidExpenses.length} από {expenses.length} πληρωμένα</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Πρόσφατα Έξοδα</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {recentExpenses.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                Δεν υπάρχουν καταχωρημένα έξοδα
              </div>
            ) : (
              recentExpenses.map((expense: any) => (
                <div key={expense.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {expense.category?.description || expense.category?.name || 'Χωρίς κατηγορία'} • {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(expense.amount))}
                      </span>
                      <p className={`text-xs mt-1 ${expense.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                        {expense.isPaid ? 'Πληρωμένο' : 'Εκκρεμεί'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={() => navigate('/expenses')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Προβολή όλων →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Γρήγορες Ενέργειες</h2>
          </div>
          <div className="p-6 space-y-3">
            <button 
              onClick={() => navigate('/expenses')}
              className="w-full text-left px-4 py-3 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">➕</span>
                <div>
                  <p className="font-medium text-gray-900">Νέο Έξοδο</p>
                  <p className="text-sm text-gray-600">Καταχώρηση νέου εξόδου</p>
                </div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/common-charges')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">🧾</span>
                <div>
                  <p className="font-medium text-gray-900">Κοινόχρηστα</p>
                  <p className="text-sm text-gray-600">Προβολή & υπολογισμός κοινοχρήστων</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => navigate('/configuration')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <div className="flex items-center">
                <span className="text-xl mr-3">⚙️</span>
                <div>
                  <p className="font-medium text-gray-900">Ρυθμίσεις</p>
                  <p className="text-sm text-gray-600">Διαχείριση πολυκατοικιών & διαμερισμάτων</p>
                </div>
              </div>
            </button>

            {isSuperAdmin && (
              <button 
                onClick={() => navigate('/configuration')}
                className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-xl mr-3">👥</span>
                  <div>
                    <p className="font-medium text-gray-900">Διαχείριση Χρηστών</p>
                    <p className="text-sm text-gray-600">Προσθήκη & επεξεργασία χρηστών</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Building Summary (for Super Admin) */}
      {isSuperAdmin && buildings.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Επισκόπηση Πολυκατοικιών</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Όνομα</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Διεύθυνση</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Διαμερίσματα</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Έξοδα</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {buildings.map((building: any) => (
                  <tr key={building.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {building.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {building.address}, {building.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                      {building._count?.apartments || building.apartmentCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                      {building._count?.expenses || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

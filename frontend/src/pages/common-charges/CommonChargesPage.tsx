import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { commonChargesApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';

export const CommonChargesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const buildingId = user?.buildingId || 'demo-building-id';
  const canWrite = hasRole([UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]);

  const { data: periods, isLoading, isError } = useQuery({
    queryKey: ['commonChargesPeriods', buildingId],
    queryFn: () => commonChargesApi.getPeriods(buildingId),
    enabled: !!buildingId,
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      DRAFT: 'bg-gray-100 text-gray-800',
      CALCULATED: 'bg-blue-100 text-blue-800',
      LOCKED: 'bg-green-100 text-green-800',
    };
    return styles[status as keyof typeof styles] || styles.DRAFT;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatPeriod = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('el-GR', { year: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p>Σφάλμα φόρτωσης κοινοχρήστων. Δοκιμάστε ξανά.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Κοινόχρηστα</h1>
          <p className="text-gray-600 mt-1">Υπολογισμός και διαχείριση κοινοχρήστων εξόδων</p>
        </div>
        <button
          disabled={!canWrite}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <span className="mr-2">➕</span>
          Νέα Περίοδος
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-xl">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Πληροφορίες Κοινοχρήστων</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Υπολογίστε τα κοινόχρηστα για κάθε περίοδο με βάση τα έξοδα</li>
                <li>Κλειδώστε την περίοδο για να αποτρέψετε αλλαγές</li>
                <li>Εκτυπώστε ή κατεβάστε PDF για κάθε διαμέρισμα</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Periods Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Περίοδος
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Κατάσταση
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Σύνολο Εξόδων
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ημ/νία Υπολογισμού
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ημ/νία Κλειδώματος
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider no-print">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!periods || periods.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Δεν βρέθηκαν περίοδοι
                  </td>
                </tr>
              ) : (
                periods.map((period) => (
                  <tr key={period.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatPeriod(period.year, period.month)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(period.status)}`}>
                        {period.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(period.totalExpenses)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {period.calculatedAt
                        ? new Date(period.calculatedAt).toLocaleDateString('el-GR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {period.lockedAt
                        ? new Date(period.lockedAt).toLocaleDateString('el-GR')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="text-primary-600 hover:text-primary-900"
                          title="Προβολή"
                        >
                          👁️
                        </button>
                        {period.status === 'DRAFT' && (
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            disabled={!canWrite}
                            title="Υπολογισμός"
                          >
                            🧮
                          </button>
                        )}
                        {period.status === 'CALCULATED' && (
                          <button
                            className="text-green-600 hover:text-green-900"
                            disabled={!canWrite}
                            title="Κλείδωμα"
                          >
                            🔒
                          </button>
                        )}
                        {period.status === 'LOCKED' && (
                          <button
                            className="text-gray-600 hover:text-gray-900"
                            title="Κατέβασμα PDF"
                          >
                            📄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Οδηγίες</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-900 mb-1">1. Δημιουργία Περιόδου</p>
            <p>Δημιουργήστε νέα περίοδο για να ξεκινήσετε τον υπολογισμό κοινοχρήστων.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">2. Υπολογισμός</p>
            <p>Υπολογίστε τα κοινόχρηστα με βάση τα έξοδα της περιόδου.</p>
          </div>
          <div>
            <p className="font-medium text-gray-900 mb-1">3. Κλείδωμα</p>
            <p>Κλειδώστε την περίοδο για να αποτρέψετε περαιτέρω αλλαγές.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

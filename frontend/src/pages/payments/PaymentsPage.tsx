import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, buildingsApi, apartmentsApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import type { Building, Apartment } from '../../types';

interface PaymentFormData {
  apartmentId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  reference: string;
  notes: string;
}

const initialFormData: PaymentFormData = {
  apartmentId: '',
  amount: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: 'CASH',
  reference: '',
  notes: '',
};

export const PaymentsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>(initialFormData);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(user?.buildingId || '');

  const canWrite = hasRole([UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]);
  const isSuperAdmin = hasRole([UserRole.SUPER_ADMIN]);

  // For super admins, fetch buildings to allow selection
  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingsApi.getAll,
    enabled: isSuperAdmin,
  });

  // Auto-select first building for super admin
  React.useEffect(() => {
    if (isSuperAdmin && buildings && buildings.length > 0 && !selectedBuildingId) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [isSuperAdmin, buildings, selectedBuildingId]);

  const buildingId = isSuperAdmin ? selectedBuildingId : (user?.buildingId || '');

  // Fetch apartments for the building
  const { data: apartments } = useQuery({
    queryKey: ['apartments', buildingId],
    queryFn: () => apartmentsApi.getAll(buildingId),
    enabled: !!buildingId,
  });

  // Fetch payments
  const { data, isLoading, isError } = useQuery({
    queryKey: ['payments', buildingId],
    queryFn: () => paymentsApi.getAll(buildingId),
    enabled: !!buildingId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', buildingId] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Create payment error:', error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(buildingId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', buildingId] });
    },
  });

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buildingId) {
      console.error('No building selected');
      return;
    }
    
    const paymentData = {
      apartmentId: formData.apartmentId,
      amount: parseFloat(formData.amount),
      paymentDate: formData.paymentDate,
      paymentMethod: formData.paymentMethod,
      reference: formData.reference || undefined,
      notes: formData.notes || undefined,
    };

    createMutation.mutate(paymentData);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την πληρωμή;')) {
      deleteMutation.mutate(id);
    }
  };

  const payments = data?.data || [];

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      CASH: 'Μετρητά',
      BANK_TRANSFER: 'Τραπεζική Μεταφορά',
      CHECK: 'Επιταγή',
      CREDIT_CARD: 'Πιστωτική Κάρτα',
      OTHER: 'Άλλο',
    };
    return methods[method] || method;
  };

  if (!buildingId && !isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-800">Δεν έχει οριστεί κτίριο για τον λογαριασμό σας.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Πληρωμές</h1>
          <p className="text-gray-600">Διαχείριση πληρωμών κοινοχρήστων</p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Νέα Πληρωμή
          </button>
        )}
      </div>

      {/* Building selector for super admins */}
      {isSuperAdmin && buildings && buildings.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Κτίριο</label>
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {buildings.map((building: Building) => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.address}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Payments Table */}
      {isLoading ? (
        <div className="text-center py-8">Φόρτωση...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-500">Σφάλμα φόρτωσης πληρωμών</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Δεν υπάρχουν πληρωμές. {canWrite && 'Πατήστε "Νέα Πληρωμή" για να προσθέσετε.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Διαμέρισμα
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ποσό
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ημερομηνία
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Τρόπος Πληρωμής
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Αναφορά
                </th>
                {canWrite && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ενέργειες
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.apartment?.number || 'Άγνωστο'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    €{parseFloat(payment.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(payment.paymentDate).toLocaleDateString('el-GR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPaymentMethod(payment.paymentMethod)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.reference || '-'}
                  </td>
                  {canWrite && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Διαγραφή"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Payment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Νέα Πληρωμή</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Διαμέρισμα *
                </label>
                <select
                  value={formData.apartmentId}
                  onChange={(e) => setFormData({ ...formData, apartmentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Επιλέξτε διαμέρισμα</option>
                  {(apartments || []).map((apt: Apartment) => (
                    <option key={apt.id} value={apt.id}>
                      {apt.number} - {apt.ownerName || 'Χωρίς ιδιοκτήτη'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ποσό (€) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημερομηνία Πληρωμής *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Τρόπος Πληρωμής *
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="CASH">Μετρητά</option>
                  <option value="BANK_TRANSFER">Τραπεζική Μεταφορά</option>
                  <option value="CHECK">Επιταγή</option>
                  <option value="CREDIT_CARD">Πιστωτική Κάρτα</option>
                  <option value="OTHER">Άλλο</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Αριθμός Αναφοράς
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="π.χ. αριθμός επιταγής, transaction ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Σημειώσεις</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {createMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commonChargesApi, buildingsApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import { formatDate } from '../../utils/dateFormat';

interface PeriodFormData {
  name: string;
  startDate: string;
  endDate: string;
  dueDate: string;
}

const getDefaultFormData = (): PeriodFormData => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Start of current month
  const startDate = new Date(year, month, 1);
  // End of current month
  const endDate = new Date(year, month + 1, 0);
  // Due date: 15th of next month
  const dueDate = new Date(year, month + 1, 15);
  
  const monthName = startDate.toLocaleDateString('el-GR', { month: 'long', year: 'numeric' });
  
  return {
    name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],
  };
};

export const CommonChargesPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canWrite = hasRole([UserRole.SUPER_ADMIN, UserRole.BUILDING_ADMIN]);
  const isSuperAdmin = hasRole([UserRole.SUPER_ADMIN]);
  
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(user?.buildingId || '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<PeriodFormData>(getDefaultFormData());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewingPeriod, setViewingPeriod] = useState<any | null>(null);
  const [editingPeriod, setEditingPeriod] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  // Validate form data
  const validateForm = (data: PeriodFormData): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!data.name.trim()) {
      errors.name = 'Το όνομα περιόδου είναι υποχρεωτικό';
    }
    
    if (!data.startDate) {
      errors.startDate = 'Η ημερομηνία έναρξης είναι υποχρεωτική';
    }
    
    if (!data.endDate) {
      errors.endDate = 'Η ημερομηνία λήξης είναι υποχρεωτική';
    }
    
    if (!data.dueDate) {
      errors.dueDate = 'Η προθεσμία πληρωμής είναι υποχρεωτική';
    }
    
    // Date validation rules
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      
      if (start > end) {
        errors.startDate = 'Η ημερομηνία έναρξης δεν μπορεί να είναι μεταγενέστερη της ημερομηνίας λήξης';
      }
    }
    
    if (data.endDate && data.dueDate) {
      const end = new Date(data.endDate);
      const due = new Date(data.dueDate);
      
      if (due < end) {
        errors.dueDate = 'Η προθεσμία πληρωμής δεν μπορεί να είναι πριν την ημερομηνία λήξης';
      }
    }
    
    return errors;
  };

  // For super admins, fetch buildings to allow selection
  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingsApi.getAll,
    enabled: isSuperAdmin,
  });

  // Auto-select first building if super admin and none selected
  React.useEffect(() => {
    if (isSuperAdmin && !selectedBuildingId && buildings.length > 0) {
      setSelectedBuildingId(buildings[0].id);
    }
  }, [isSuperAdmin, selectedBuildingId, buildings]);

  // Determine the buildingId to use
  const buildingId = isSuperAdmin ? selectedBuildingId : (user?.buildingId || '');

  const { data: periods, isLoading, isError } = useQuery({
    queryKey: ['commonChargesPeriods', buildingId],
    queryFn: () => commonChargesApi.getPeriods(buildingId),
    enabled: !!buildingId,
  });

  // Create period mutation
  const createMutation = useMutation({
    mutationFn: (data: PeriodFormData) => commonChargesApi.create(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonChargesPeriods', buildingId] });
      setIsModalOpen(false);
      setFormData(getDefaultFormData());
    },
    onError: (error) => {
      console.error('Error creating period:', error);
      alert('Σφάλμα δημιουργίας περιόδου');
    },
  });

  // Calculate period mutation
  const calculateMutation = useMutation({
    mutationFn: (periodId: string) => commonChargesApi.calculate(buildingId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonChargesPeriods', buildingId] });
      alert('Ο υπολογισμός κοινοχρήστων ολοκληρώθηκε επιτυχώς!');
    },
    onError: (error) => {
      console.error('Error calculating period:', error);
      alert('Σφάλμα υπολογισμού κοινοχρήστων');
    },
  });

  // Lock period mutation
  const lockMutation = useMutation({
    mutationFn: (periodId: string) => commonChargesApi.lock(buildingId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonChargesPeriods', buildingId] });
      alert('Η περίοδος κλειδώθηκε επιτυχώς!');
    },
    onError: (error) => {
      console.error('Error locking period:', error);
      alert('Σφάλμα κλειδώματος περιόδου');
    },
  });

  // Update period mutation
  const updateMutation = useMutation({
    mutationFn: ({ periodId, data }: { periodId: string; data: PeriodFormData }) => 
      commonChargesApi.update(buildingId, periodId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonChargesPeriods', buildingId] });
      setEditingPeriod(null);
      setFormData(getDefaultFormData());
      alert('Η περίοδος ενημερώθηκε επιτυχώς!');
    },
    onError: (error) => {
      console.error('Error updating period:', error);
      alert('Σφάλμα ενημέρωσης περιόδου');
    },
  });

  // Delete period mutation
  const deleteMutation = useMutation({
    mutationFn: (periodId: string) => commonChargesApi.delete(buildingId, periodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commonChargesPeriods', buildingId] });
      alert('Η περίοδος διαγράφηκε επιτυχώς!');
    },
    onError: (error) => {
      console.error('Error deleting period:', error);
      alert('Σφάλμα διαγραφής περιόδου');
    },
  });

  // Preview calculation query
  const fetchPreview = async (periodId: string) => {
    try {
      const data = await commonChargesApi.preview(buildingId, periodId);
      setPreviewData(data);
    } catch (error) {
      console.error('Error fetching preview:', error);
      alert('Σφάλμα φόρτωσης προεπισκόπησης');
    }
  };

  const handleCalculate = (periodId: string) => {
    if (confirm('Θέλετε να υπολογίσετε τα κοινόχρηστα για αυτή την περίοδο;')) {
      calculateMutation.mutate(periodId);
    }
  };

  const handleLock = (periodId: string) => {
    if (confirm('Θέλετε να κλειδώσετε αυτή την περίοδο; Δεν θα μπορείτε να κάνετε αλλαγές μετά.')) {
      lockMutation.mutate(periodId);
    }
  };

  const handleViewPeriod = (period: any) => {
    setViewingPeriod(period);
  };

  const handleEditPeriod = (period: any) => {
    setFormData({
      name: period.name,
      startDate: new Date(period.startDate).toISOString().split('T')[0],
      endDate: new Date(period.endDate).toISOString().split('T')[0],
      dueDate: new Date(period.dueDate).toISOString().split('T')[0],
    });
    setFormErrors({});
    setEditingPeriod(period);
  };

  const handleDeletePeriod = (periodId: string) => {
    if (confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την περίοδο; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.')) {
      deleteMutation.mutate(periodId);
    }
  };

  const handlePreviewPeriod = (periodId: string) => {
    fetchPreview(periodId);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length === 0 && editingPeriod) {
      updateMutation.mutate({ periodId: editingPeriod.id, data: formData });
    }
  };

  const handleCloseEditModal = () => {
    setEditingPeriod(null);
    setFormData(getDefaultFormData());
    setFormErrors({});
  };

  const handleOpenModal = () => {
    setFormData(getDefaultFormData());
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(getDefaultFormData());
    setFormErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm(formData);
    setFormErrors(errors);
    
    if (Object.keys(errors).length === 0) {
      createMutation.mutate(formData);
    }
  };

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

  if (!buildingId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Κοινόχρηστα</h1>
          <p className="text-gray-600 mt-1">Υπολογισμός και διαχείριση κοινοχρήστων εξόδων</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p>Παρακαλώ επιλέξτε πολυκατοικία για να δείτε τα κοινόχρηστα.</p>
        </div>
        {isSuperAdmin && buildings.length > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Επιλέξτε Πολυκατοικία
            </label>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">-- Επιλέξτε --</option>
              {buildings.map((building: any) => (
                <option key={building.id} value={building.id}>
                  {building.name} - {building.address}
                </option>
              ))}
            </select>
          </div>
        )}
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
          onClick={handleOpenModal}
          disabled={!canWrite}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <span className="mr-2">➕</span>
          Νέα Περίοδος
        </button>
      </div>

      {/* Building Selector for Super Admins */}
      {isSuperAdmin && buildings.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Πολυκατοικία
          </label>
          <select
            value={selectedBuildingId}
            onChange={(e) => setSelectedBuildingId(e.target.value)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            {buildings.map((building: any) => (
              <option key={building.id} value={building.id}>
                {building.name} - {building.address}
              </option>
            ))}
          </select>
        </div>
      )}

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
                      {formatDate(period.calculatedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(period.lockedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium no-print">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewPeriod(period)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Προβολή"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handlePreviewPeriod(period.id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Προεπισκόπηση Υπολογισμού"
                        >
                          📊
                        </button>
                        {!period.isLocked && (
                          <>
                            <button
                              onClick={() => handleEditPeriod(period)}
                              className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                              disabled={!canWrite}
                              title="Επεξεργασία"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeletePeriod(period.id)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              disabled={!canWrite || deleteMutation.isPending}
                              title="Διαγραφή"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                        {period.status === 'DRAFT' && (
                          <button
                            onClick={() => handleCalculate(period.id)}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            disabled={!canWrite || calculateMutation.isPending}
                            title="Υπολογισμός"
                          >
                            🧮
                          </button>
                        )}
                        {period.status === 'CALCULATED' && (
                          <button
                            onClick={() => handleLock(period.id)}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            disabled={!canWrite || lockMutation.isPending}
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

      {/* Modal for New Period */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Νέα Περίοδος Κοινοχρήστων</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Όνομα Περιόδου *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  required
                  placeholder="π.χ. Ιανουάριος 2026"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημ/νία Έναρξης *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημ/νία Λήξης *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Προθεσμία Πληρωμής *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (formErrors.dueDate) setFormErrors({ ...formErrors, dueDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
                >
                  {createMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Period Modal */}
      {viewingPeriod && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Λεπτομέρειες Περιόδου: {viewingPeriod.name}
              </h3>
              <button
                onClick={() => setViewingPeriod(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Status Badge */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Κατάσταση:</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(viewingPeriod.status)}`}>
                  {viewingPeriod.status === 'DRAFT' && 'Πρόχειρη'}
                  {viewingPeriod.status === 'CALCULATED' && 'Υπολογισμένη'}
                  {viewingPeriod.status === 'LOCKED' && 'Κλειδωμένη'}
                </span>
              </div>

              {/* Period Details */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Ημ/νία Έναρξης</p>
                  <p className="font-medium">{formatDate(viewingPeriod.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ημ/νία Λήξης</p>
                  <p className="font-medium">{formatDate(viewingPeriod.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Προθεσμία Πληρωμής</p>
                  <p className="font-medium">{formatDate(viewingPeriod.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Έκδοση</p>
                  <p className="font-medium">{viewingPeriod.version}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Οικονομική Σύνοψη</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-600">Σύνολο Εξόδων</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(viewingPeriod.totalExpenses || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Σύνολο Χρεώσεων</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(viewingPeriod.totalCharges || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Ημ/νία Υπολογισμού</p>
                  <p className="font-medium">
                    {formatDate(viewingPeriod.calculatedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Ημ/νία Κλειδώματος</p>
                  <p className="font-medium">
                    {formatDate(viewingPeriod.lockedAt)}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                {viewingPeriod.status === 'DRAFT' && canWrite && (
                  <button
                    onClick={() => {
                      setViewingPeriod(null);
                      handleCalculate(viewingPeriod.id);
                    }}
                    disabled={calculateMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    🧮 Υπολογισμός
                  </button>
                )}
                {viewingPeriod.status === 'CALCULATED' && canWrite && (
                  <button
                    onClick={() => {
                      setViewingPeriod(null);
                      handleLock(viewingPeriod.id);
                    }}
                    disabled={lockMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    🔒 Κλείδωμα
                  </button>
                )}
                <button
                  onClick={() => setViewingPeriod(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Period Modal */}
      {editingPeriod && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Επεξεργασία Περιόδου</h3>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Όνομα Περιόδου *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημ/νία Έναρξης *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    setFormData({ ...formData, startDate: e.target.value });
                    if (formErrors.startDate) setFormErrors({ ...formErrors, startDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ημ/νία Λήξης *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => {
                    setFormData({ ...formData, endDate: e.target.value });
                    if (formErrors.endDate) setFormErrors({ ...formErrors, endDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.endDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Προθεσμία Πληρωμής *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (formErrors.dueDate) setFormErrors({ ...formErrors, dueDate: '' });
                  }}
                  required
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 ${
                    formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.dueDate && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
                >
                  {updateMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Calculation Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-5 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                📊 Προεπισκόπηση Υπολογισμού: {previewData.period?.name}
              </h3>
              <button
                onClick={() => setPreviewData(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-3">Σύνοψη</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-blue-600">Σύνολο Εξόδων</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(previewData.summary?.totalExpenses || 0)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Αριθμός Εξόδων</p>
                    <p className="text-xl font-bold text-blue-900">{previewData.summary?.expenseCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-600">Διαμερίσματα</p>
                    <p className="text-xl font-bold text-blue-900">{previewData.summary?.apartmentCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Expenses by Category */}
              {previewData.summary?.expensesByCategory && Object.keys(previewData.summary.expensesByCategory).length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Έξοδα ανά Κατηγορία</h4>
                  <div className="space-y-2">
                    {Object.entries(previewData.summary.expensesByCategory).map(([category, amount]: [string, any]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{category}</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Apartment Charges Preview */}
              {previewData.apartmentCharges && previewData.apartmentCharges.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Εκτιμώμενες Χρεώσεις ανά Διαμέρισμα</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Διαμέρισμα</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ιδιοκτήτης</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">τ.μ.</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Κοινόχρ. %</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Εκτίμηση</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.apartmentCharges.map((apt: any) => (
                          <tr key={apt.apartmentId} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm font-medium text-gray-900">
                              {apt.apartmentNumber} (Όροφος {apt.floor})
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">{apt.ownerName}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{apt.squareMeters}</td>
                            <td className="px-4 py-2 text-sm text-gray-600 text-right">{apt.shares?.common || 0}%</td>
                            <td className="px-4 py-2 text-sm font-semibold text-gray-900 text-right">
                              {formatCurrency(apt.estimatedCharge)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expenses List */}
              {previewData.expenses && previewData.expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Έξοδα Περιόδου</h4>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Περιγραφή</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Κατηγορία</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ημ/νία</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ποσό</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.expenses.map((exp: any) => (
                          <tr key={exp.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{exp.description}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{exp.category}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {formatDate(exp.date)}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                              {formatCurrency(exp.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Warning if no expenses */}
              {(!previewData.expenses || previewData.expenses.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    ⚠️ Δεν υπάρχουν έξοδα για αυτή την περίοδο. Προσθέστε έξοδα πριν υπολογίσετε τα κοινόχρηστα.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Κλείσιμο
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

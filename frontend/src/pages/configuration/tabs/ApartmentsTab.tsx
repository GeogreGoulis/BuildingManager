import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apartmentsApi, buildingsApi } from '../../../services/endpoints';

interface ApartmentFormData {
  buildingId: string;
  number: string;
  floor: number;
  squareMeters: number;
  shareCommon: number;
  shareElevator: number;
  shareHeating: number;
  shareSpecial: number;
  shareOwner: number;
  shareOther: number;
  ownerId?: string;
  isOccupied: boolean;
  hasHeating: boolean;
}

const initialFormData: ApartmentFormData = {
  buildingId: '',
  number: '',
  floor: 0,
  squareMeters: 0,
  shareCommon: 0,
  shareElevator: 0,
  shareHeating: 0,
  shareSpecial: 0,
  shareOwner: 0,
  shareOther: 0,
  ownerId: '',
  isOccupied: true,
  hasHeating: true,
};

export const ApartmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<any | null>(null);
  const [formData, setFormData] = useState<ApartmentFormData>(initialFormData);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

  const { data: buildings } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => buildingsApi.getAll(),
  });

  const { data: apartments, isLoading, isError } = useQuery({
    queryKey: ['apartments', selectedBuildingId],
    queryFn: () => apartmentsApi.getAll(selectedBuildingId || undefined),
  });

  const createMutation = useMutation({
    mutationFn: (data: ApartmentFormData) => apartmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ApartmentFormData> }) =>
      apartmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apartmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apartments'] });
    },
  });

  const openCreateModal = () => {
    setEditingApartment(null);
    setFormData({
      ...initialFormData,
      buildingId: selectedBuildingId || '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (apartment: any) => {
    setEditingApartment(apartment);
    setFormData({
      buildingId: apartment.buildingId,
      number: apartment.number,
      floor: apartment.floor,
      squareMeters: parseFloat(apartment.squareMeters),
      shareCommon: parseFloat(apartment.shareCommon || 0),
      shareElevator: parseFloat(apartment.shareElevator || 0),
      shareHeating: parseFloat(apartment.shareHeating || 0),
      shareSpecial: parseFloat(apartment.shareSpecial || 0),
      shareOwner: parseFloat(apartment.shareOwner || 0),
      shareOther: parseFloat(apartment.shareOther || 0),
      ownerId: apartment.ownerId || '',
      isOccupied: apartment.isOccupied,
      hasHeating: apartment.hasHeating,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingApartment(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      ownerId: formData.ownerId || undefined,
    };

    if (editingApartment) {
      updateMutation.mutate({ id: editingApartment.id, data: submitData });
    } else {
      createMutation.mutate(submitData as any);
    }
  };

  const handleDelete = (id: string, number: string) => {
    if (window.confirm(`Είστε σίγουροι ότι θέλετε να διαγράψετε το διαμέρισμα "${number}";`)) {
      deleteMutation.mutate(id);
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings?.find((b: any) => b.id === buildingId);
    return building?.name || '-';
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
        <p>Σφάλμα φόρτωσης διαμερισμάτων. Δοκιμάστε ξανά.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Διαχείριση Διαμερισμάτων</h2>
          <p className="text-sm text-gray-500">Δημιουργία και επεξεργασία διαμερισμάτων</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          + Νέο Διαμέρισμα
        </button>
      </div>

      {/* Building Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <label className="block text-sm font-medium text-gray-700 mb-2">Φίλτρο ανά Κτίριο</label>
        <select
          value={selectedBuildingId}
          onChange={(e) => setSelectedBuildingId(e.target.value)}
          className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Όλα τα κτίρια</option>
          {buildings?.map((building: any) => (
            <option key={building.id} value={building.id}>
              {building.name}
            </option>
          ))}
        </select>
      </div>

      {/* Apartments List */}
      {apartments && apartments.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">Δεν υπάρχουν διαμερίσματα</p>
          <p className="text-gray-400 mt-2">
            {selectedBuildingId 
              ? 'Δημιουργήστε το πρώτο διαμέρισμα για αυτό το κτίριο'
              : 'Επιλέξτε κτίριο ή δημιουργήστε νέο διαμέρισμα'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Διαμέρισμα
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Κτίριο
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Τ.Μ.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Χιλιοστά
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ιδιοκτήτης
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Κατάσταση
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apartments?.map((apartment: any) => (
                <tr key={apartment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      Διαμ. {apartment.number}
                    </div>
                    <div className="text-xs text-gray-500">Όροφος {apartment.floor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getBuildingName(apartment.buildingId)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{parseFloat(apartment.squareMeters).toFixed(2)} m²</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs text-gray-900 space-y-0.5">
                      <div>Κοιν: {parseFloat(apartment.shareCommon || 0).toFixed(2)}%</div>
                      <div>Ανελ: {parseFloat(apartment.shareElevator || 0).toFixed(2)}%</div>
                      <div>Θέρμ: {parseFloat(apartment.shareHeating || 0).toFixed(2)}%</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {apartment.owner ? (
                      <div>
                        <div className="text-sm text-gray-900">
                          {apartment.owner.firstName} {apartment.owner.lastName}
                        </div>
                        <div className="text-xs text-gray-500">{apartment.owner.email}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        apartment.isOccupied ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {apartment.isOccupied ? 'Κατοικείται' : 'Κενό'}
                      </span>
                      {apartment.hasHeating && (
                        <span className="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                          Θέρμανση
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openEditModal(apartment)}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Επεξεργασία
                    </button>
                    <button
                      onClick={() => handleDelete(apartment.id, apartment.number)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Διαγραφή
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingApartment ? 'Επεξεργασία Διαμερίσματος' : 'Νέο Διαμέρισμα'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Κτίριο *</label>
                  <select
                    required
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    disabled={!!editingApartment}
                  >
                    <option value="">-- Επιλέξτε Κτίριο --</option>
                    {buildings?.map((building: any) => (
                      <option key={building.id} value={building.id}>
                        {building.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Αριθμός Διαμ. *</label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      placeholder="π.χ. 1Α, 2Β"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Όροφος *</label>
                    <input
                      type="number"
                      required
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Τετραγωνικά Μέτρα *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.squareMeters}
                    onChange={(e) => setFormData({ ...formData, squareMeters: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Χιλιοστά συμμετοχής */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Χιλιοστά Συμμετοχής (%)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Κοινόχρηστα</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareCommon}
                        onChange={(e) => setFormData({ ...formData, shareCommon: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ανελκυστήρας</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareElevator}
                        onChange={(e) => setFormData({ ...formData, shareElevator: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Θέρμανση</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareHeating}
                        onChange={(e) => setFormData({ ...formData, shareHeating: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ειδικά Έξοδα</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareSpecial}
                        onChange={(e) => setFormData({ ...formData, shareSpecial: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Έξοδα Ιδιοκτητών</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareOwner}
                        onChange={(e) => setFormData({ ...formData, shareOwner: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Λοιπά Έξοδα</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.shareOther}
                        onChange={(e) => setFormData({ ...formData, shareOther: parseFloat(e.target.value) || 0 })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Εισάγετε το ποσοστό συμμετοχής για κάθε κατηγορία εξόδων (0-100%)</p>
                </div>

                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isOccupied}
                      onChange={(e) => setFormData({ ...formData, isOccupied: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Κατοικείται</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.hasHeating}
                      onChange={(e) => setFormData({ ...formData, hasHeating: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Συμμετέχει στη θέρμανση</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Ακύρωση
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

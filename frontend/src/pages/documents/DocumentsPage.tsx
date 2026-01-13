import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, buildingsApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import type { Building } from '../../types';

interface DocumentFormData {
  title: string;
  description: string;
  category: string;
  file: File | null;
}

const initialFormData: DocumentFormData = {
  title: '',
  description: '',
  category: 'OTHER',
  file: null,
};

export const DocumentsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
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

  // Fetch documents
  const { data: documents, isLoading, isError } = useQuery({
    queryKey: ['documents', buildingId],
    queryFn: () => documentsApi.getAll(buildingId),
    enabled: !!buildingId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, title, description }: { file: File; title: string; description?: string }) =>
      documentsApi.upload(buildingId, file, title, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', buildingId] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Upload document error:', error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(buildingId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', buildingId] });
    },
  });

  const handleOpenModal = () => {
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData({ ...formData, file, title: file?.name || formData.title });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buildingId || !formData.file) {
      console.error('No building or file selected');
      return;
    }

    uploadMutation.mutate({
      file: formData.file,
      title: formData.title,
      description: formData.description || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το έγγραφο;')) {
      deleteMutation.mutate(id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatCategory = (category: string) => {
    const categories: Record<string, string> = {
      INVOICE: 'Τιμολόγιο',
      CONTRACT: 'Συμβόλαιο',
      RECEIPT: 'Απόδειξη',
      MINUTES: 'Πρακτικά',
      REPORT: 'Αναφορά',
      OTHER: 'Άλλο',
    };
    return categories[category] || category;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    return '📄';
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
          <h1 className="text-2xl font-bold text-gray-900">Έγγραφα</h1>
          <p className="text-gray-600">Διαχείριση εγγράφων κτιρίου</p>
        </div>
        {canWrite && (
          <button
            onClick={handleOpenModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Νέο Έγγραφο
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

      {/* Documents Grid */}
      {isLoading ? (
        <div className="text-center py-8">Φόρτωση...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-500">Σφάλμα φόρτωσης εγγράφων</div>
      ) : !documents || documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Δεν υπάρχουν έγγραφα. {canWrite && 'Πατήστε "Νέο Έγγραφο" για να προσθέσετε.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc: any) => (
            <div key={doc.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getFileIcon(doc.mimeType)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 truncate max-w-[200px]" title={doc.name}>
                      {doc.name}
                    </h3>
                    <p className="text-sm text-gray-500">{formatFileSize(doc.size)}</p>
                  </div>
                </div>
                {canWrite && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Διαγραφή"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{formatCategory(doc.category)}</span>
                  <span className="text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString('el-GR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Νέο Έγγραφο</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Αρχείο *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Τίτλος *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Κατηγορία</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INVOICE">Τιμολόγιο</option>
                  <option value="CONTRACT">Συμβόλαιο</option>
                  <option value="RECEIPT">Απόδειξη</option>
                  <option value="MINUTES">Πρακτικά</option>
                  <option value="REPORT">Αναφορά</option>
                  <option value="OTHER">Άλλο</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Περιγραφή</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
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
                  disabled={uploadMutation.isPending || !formData.file}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {uploadMutation.isPending ? 'Ανέβασμα...' : 'Ανέβασμα'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

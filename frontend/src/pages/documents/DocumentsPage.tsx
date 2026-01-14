import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, buildingsApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import type { Building } from '../../types';
import { formatDate } from '../../utils/dateFormat';

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [formData, setFormData] = useState<DocumentFormData>(initialFormData);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(user?.buildingId || '');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);

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
    mutationFn: ({ file, title, category, description }: { file: File; title: string; category: string; description?: string }) =>
      documentsApi.upload(buildingId, file, title, category, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', buildingId] });
      handleCloseModal();
    },
    onError: (error: any) => {
      console.error('Upload document error:', error);
      const message = error.response?.data?.message || error.message || 'Σφάλμα ανεβάσματος αρχείου';
      alert(message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; category?: string } }) =>
      documentsApi.update(buildingId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', buildingId] });
      handleCloseEditModal();
    },
    onError: (error) => {
      console.error('Update document error:', error);
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
      category: formData.category,
      description: formData.description || undefined,
    });
  };

  const handleOpenEditModal = (doc: any) => {
    setEditingDocument({
      ...doc,
      name: doc.name,
      category: doc.category,
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDocument(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDocument) return;

    updateMutation.mutate({
      id: editingDocument.id,
      data: {
        name: editingDocument.name,
        category: editingDocument.category,
      },
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

  const handleSelectAll = (checked: boolean) => {
    if (checked && documents) {
      setSelectedDocuments(new Set(documents.map((doc: any) => doc.id)));
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleSelectDocument = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedDocuments);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedDocuments(newSelected);
  };

  const handleDownloadSingle = async (doc: any) => {
    try {
      setIsDownloading(true);
      
      // Get the token for authenticated download
      const token = localStorage.getItem('accessToken');
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
      const downloadUrl = `${apiBaseUrl}/buildings/${buildingId}/documents/${doc.id}/download`;
      
      // Use fetch with authorization header
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Download failed' }));
        throw new Error(error.message || 'Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Download error:', error);
      let errorMessage = error.message || 'Σφάλμα κατά τη λήψη του αρχείου';
      if (errorMessage === 'File not found on disk') {
        errorMessage = 'Το αρχείο δεν βρέθηκε στον διακομιστή. Παρακαλώ ανεβάστε το ξανά.';
      }
      alert(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedDocuments.size === 0) return;

    try {
      setIsDownloading(true);
      
      if (selectedDocuments.size === 1) {
        // Download single file
        const docId = Array.from(selectedDocuments)[0];
        const doc = documents?.find((d: any) => d.id === docId);
        if (doc) {
          await handleDownloadSingle(doc);
        }
      } else {
        // Download multiple as ZIP
        const token = localStorage.getItem('accessToken');
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
        const downloadUrl = `${apiBaseUrl}/buildings/${buildingId}/documents/download-zip`;
        
        const response = await fetch(downloadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: Array.from(selectedDocuments) }),
        });
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ message: 'Download failed' }));
          throw new Error(error.message || 'Download failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documents_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
      setSelectedDocuments(new Set());
    } catch (error: any) {
      console.error('Download error:', error);
      const errorMessage = error.message || 'Σφάλμα κατά τη λήψη των αρχείων';
      alert(errorMessage);
    } finally {
      setIsDownloading(false);
    }
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
        <div className="flex space-x-2">
          {selectedDocuments.size > 0 && (
            <button
              onClick={handleDownloadSelected}
              disabled={isDownloading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-400"
            >
              {isDownloading ? 'Λήψη...' : `⬇️ Λήψη (${selectedDocuments.size})`}
            </button>
          )}
          {canWrite && (
            <button
              onClick={handleOpenModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Νέο Έγγραφο
            </button>
          )}
        </div>
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

      {/* Documents Table */}
      {isLoading ? (
        <div className="text-center py-8">Φόρτωση...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-500">Σφάλμα φόρτωσης εγγράφων</div>
      ) : !documents || documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Δεν υπάρχουν έγγραφα. {canWrite && 'Πατήστε "Νέο Έγγραφο" για να προσθέσετε.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={documents.length > 0 && selectedDocuments.size === documents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Τύπος
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Όνομα
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Κατηγορία
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Μέγεθος
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ημερομηνία
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ενέργειες
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.has(doc.id)}
                      onChange={(e) => handleSelectDocument(doc.id, e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-2xl">
                    {getFileIcon(doc.mimeType)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{doc.name}</div>
                    {doc.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{doc.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatCategory(doc.category)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatFileSize(doc.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleDownloadSingle(doc)}
                      disabled={isDownloading}
                      className="text-blue-600 hover:text-blue-800 disabled:text-blue-400"
                      title="Λήψη"
                    >
                      ⬇️
                    </button>
                    {canWrite && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(doc)}
                          className="text-yellow-600 hover:text-yellow-800"
                          title="Επεξεργασία"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Διαγραφή"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Edit Document Modal */}
      {isEditModalOpen && editingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Επεξεργασία Εγγράφου</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα *</label>
                <input
                  type="text"
                  value={editingDocument.name}
                  onChange={(e) => setEditingDocument({ ...editingDocument, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Κατηγορία</label>
                <select
                  value={editingDocument.category}
                  onChange={(e) => setEditingDocument({ ...editingDocument, category: e.target.value })}
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

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Ακύρωση
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {updateMutation.isPending ? 'Αποθήκευση...' : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

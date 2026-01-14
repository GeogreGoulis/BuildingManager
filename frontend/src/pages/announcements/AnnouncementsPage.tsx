import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi, buildingsApi } from '../../services/endpoints';
import { useAuth } from '../../app/AuthContext';
import { UserRole } from '../../types';
import type { Building } from '../../types';
import { formatDate } from '../../utils/dateFormat';

interface AnnouncementFormData {
  title: string;
  content: string;
  priority: string;
  isActive: boolean;
}

const initialFormData: AnnouncementFormData = {
  title: '',
  content: '',
  priority: 'NORMAL',
  isActive: true,
};

export const AnnouncementsPage: React.FC = () => {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [formData, setFormData] = useState<AnnouncementFormData>(initialFormData);
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

  // Fetch announcements
  const { data: announcements, isLoading, isError } = useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: () => announcementsApi.getAll(buildingId),
    enabled: !!buildingId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => announcementsApi.create(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', buildingId] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Create announcement error:', error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      announcementsApi.update(buildingId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', buildingId] });
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Update announcement error:', error);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.delete(buildingId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements', buildingId] });
    },
  });

  const handleOpenModal = (announcement?: any) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        isActive: announcement.isActive,
      });
    } else {
      setEditingAnnouncement(null);
      setFormData(initialFormData);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    setFormData(initialFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!buildingId) {
      console.error('No building selected');
      return;
    }

    const announcementData = {
      title: formData.title,
      content: formData.content,
      priority: formData.priority,
      isActive: formData.isActive,
    };

    if (editingAnnouncement) {
      updateMutation.mutate({ id: editingAnnouncement.id, data: announcementData });
    } else {
      createMutation.mutate(announcementData);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ανακοίνωση;')) {
      deleteMutation.mutate(id);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      HIGH: { bg: 'bg-red-100', text: 'text-red-800', label: 'Υψηλή' },
      NORMAL: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Κανονική' },
      LOW: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Χαμηλή' },
    };
    const badge = badges[priority] || badges.NORMAL;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Ανακοινώσεις</h1>
          <p className="text-gray-600">Διαχείριση ανακοινώσεων κτιρίου</p>
        </div>
        {canWrite && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Νέα Ανακοίνωση
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

      {/* Announcements List */}
      {isLoading ? (
        <div className="text-center py-8">Φόρτωση...</div>
      ) : isError ? (
        <div className="text-center py-8 text-red-500">Σφάλμα φόρτωσης ανακοινώσεων</div>
      ) : !announcements || announcements.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Δεν υπάρχουν ανακοινώσεις. {canWrite && 'Πατήστε "Νέα Ανακοίνωση" για να προσθέσετε.'}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement: any) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-lg shadow p-6 ${!announcement.isActive ? 'opacity-60' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{announcement.title}</h3>
                    {getPriorityBadge(announcement.priority)}
                    {!announcement.isActive && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Ανενεργή
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
                  <div className="mt-3 text-sm text-gray-400">
                    {formatDate(announcement.createdAt)}
                  </div>
                </div>
                {canWrite && (
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleOpenModal(announcement)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Επεξεργασία"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Διαγραφή"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Announcement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingAnnouncement ? 'Επεξεργασία Ανακοίνωσης' : 'Νέα Ανακοίνωση'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Περιεχόμενο *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Προτεραιότητα</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="HIGH">Υψηλή</option>
                  <option value="NORMAL">Κανονική</option>
                  <option value="LOW">Χαμηλή</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                  Ενεργή ανακοίνωση
                </label>
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Αποθήκευση...'
                    : 'Αποθήκευση'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

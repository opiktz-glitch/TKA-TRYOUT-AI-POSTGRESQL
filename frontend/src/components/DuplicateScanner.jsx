import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FiX, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DuplicateScanner = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [selectedForDeletion, setSelectedForDeletion] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/questions/find-duplicates');
      setDuplicateGroups(res.data);
    } catch (err) {
      toast.error('Gagal mencari duplikat.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDelete = (id) => {
    if (selectedForDeletion.includes(id)) {
      setSelectedForDeletion(selectedForDeletion.filter(qId => qId !== id));
    } else {
      setSelectedForDeletion([...selectedForDeletion, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForDeletion.length === 0) return;
    if (!window.confirm(`Yakin ingin menghapus ${selectedForDeletion.length} soal?`)) return;

    try {
      setIsDeleting(true);
      await api.post('/questions/bulk-delete', { question_ids: selectedForDeletion });
      toast.success('Soal berhasil dihapus.');
      setSelectedForDeletion([]);
      fetchDuplicates();
    } catch (err) {
      toast.error('Gagal menghapus soal.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pembersih Soal Duplikat (Kemiripan &gt;85%)</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Sedang memindai ribuan soal...</span>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FiCheckCircle size={64} className="text-green-500 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 dark:text-gray-200">Bank Soal Bersih!</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Tidak ditemukan soal kembar atau duplikat.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {duplicateGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border-l-4 border-yellow-500">
                  <h3 className="text-lg font-bold mb-3 text-gray-700 dark:text-gray-200">Grup Duplikat #{groupIdx + 1}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map((q) => (
                      <div 
                        key={q.id} 
                        className={`p-3 border rounded relative transition-colors ${
                          selectedForDeletion.includes(q.id) 
                            ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-800' 
                            : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                        }`}
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex justify-between">
                          <span>ID: {q.id}</span>
                          <span>{new Date(q.created_at).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="text-sm text-gray-800 dark:text-gray-200 mb-4 line-clamp-4">
                          {q.text}
                        </div>
                        
                        <div className="absolute bottom-3 right-3">
                          <label className="flex items-center space-x-2 cursor-pointer bg-white dark:bg-gray-800 px-2 py-1 rounded shadow-sm border border-gray-200 dark:border-gray-600">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 text-red-600 focus:ring-red-500 rounded cursor-pointer"
                              checked={selectedForDeletion.includes(q.id)}
                              onChange={() => handleToggleDelete(q.id)}
                            />
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Hapus Ini</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Terpilih untuk dihapus: <strong className="text-red-600 dark:text-red-400">{selectedForDeletion.length}</strong> soal
          </span>
          <div className="space-x-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Tutup
            </button>
            <button 
              onClick={handleBulkDelete}
              disabled={selectedForDeletion.length === 0 || isDeleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded font-medium flex items-center space-x-2"
            >
              <FiTrash2 /> 
              <span>{isDeleting ? 'Menghapus...' : 'Hapus Terpilih'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateScanner;

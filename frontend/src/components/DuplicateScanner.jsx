import React, { useState, useEffect } from 'react';
import { getDuplicates, bulkDeleteQuestions } from '../services/api';
import toast from 'react-hot-toast';
import './DuplicateScanner.css';

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
      const data = await getDuplicates();
      setDuplicateGroups(data);
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
      await bulkDeleteQuestions(selectedForDeletion);
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
    <div className="modal-overlay">
      <div className="modal duplicate-scanner-modal">
        <div className="modal-header">
          <div>
            <h2>Pembersih Soal Duplikat</h2>
            <p>Sistem memindai soal dengan kemiripan teks &gt;85%.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content duplicate-scanner-content">
          {loading ? (
            <div className="duplicate-scanner-loading">
              <p>Sedang memindai ribuan soal...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="duplicate-scanner-empty">
              <div className="duplicate-scanner-empty-icon">✅</div>
              <h3>Bank Soal Bersih!</h3>
              <p>Tidak ditemukan soal kembar atau duplikat.</p>
            </div>
          ) : (
            <div className="duplicate-scanner-groups">
              {duplicateGroups.map((group, groupIdx) => (
                <div key={groupIdx} className="duplicate-scanner-group">
                  <h3>Grup Duplikat #{groupIdx + 1}</h3>
                  <div className="duplicate-scanner-grid">
                    {group.map((q) => (
                      <div 
                        key={q.id} 
                        className={`duplicate-scanner-card ${selectedForDeletion.includes(q.id) ? 'selected' : ''}`}
                      >
                        <div className="duplicate-scanner-meta">
                          <span>ID: {q.id}</span>
                          {q.created_at && <span>{new Date(q.created_at).toLocaleDateString('id-ID')}</span>}
                        </div>
                        <div className="duplicate-scanner-text">
                          {q.text}
                        </div>
                        
                        <div className="duplicate-scanner-checkbox-wrapper">
                          <label className="duplicate-scanner-checkbox-label">
                            <input 
                              type="checkbox" 
                              checked={selectedForDeletion.includes(q.id)}
                              onChange={() => handleToggleDelete(q.id)}
                            />
                            <span className="duplicate-scanner-checkbox-text">Hapus Ini</span>
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

        <div className="modal-actions duplicate-scanner-actions">
          <div>
            <span className="duplicate-scanner-summary">
              Terpilih untuk dihapus: <strong className="duplicate-scanner-count">{selectedForDeletion.length}</strong> soal
            </span>
          </div>
          <div className="duplicate-scanner-buttons">
            <button type="button" className="secondary-button" onClick={onClose}>
              Tutup
            </button>
            <button 
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedForDeletion.length === 0 || isDeleting}
              className="primary-button duplicate-scanner-delete-btn"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Terpilih'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DuplicateScanner;

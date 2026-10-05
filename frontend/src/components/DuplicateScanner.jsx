import React, { useState, useEffect } from 'react';
import { getDuplicates, bulkDeleteQuestions } from '../services/api';
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
      <div className="modal" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div>
            <h2>Pembersih Soal Duplikat</h2>
            <p>Sistem memindai soal dengan kemiripan teks &gt;85%.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-content" style={{ overflowY: 'auto', padding: '20px', flex: 1, backgroundColor: '#f9fafb' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <p>Sedang memindai ribuan soal...</p>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
              <h3>Bank Soal Bersih!</h3>
              <p>Tidak ditemukan soal kembar atau duplikat.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {duplicateGroups.map((group, groupIdx) => (
                <div key={groupIdx} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #eab308', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Grup Duplikat #{groupIdx + 1}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                    {group.map((q) => (
                      <div 
                        key={q.id} 
                        style={{
                          padding: '15px',
                          border: '1px solid',
                          borderColor: selectedForDeletion.includes(q.id) ? '#fca5a5' : '#e5e7eb',
                          borderRadius: '6px',
                          backgroundColor: selectedForDeletion.includes(q.id) ? '#fef2f2' : 'white',
                          position: 'relative'
                        }}
                      >
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>ID: {q.id}</span>
                          <span>{new Date(q.created_at).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div style={{ fontSize: '14px', marginBottom: '40px', maxHeight: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {q.text}
                        </div>
                        
                        <div style={{ position: 'absolute', bottom: '15px', right: '15px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', backgroundColor: 'white', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedForDeletion.includes(q.id)}
                              onChange={() => handleToggleDelete(q.id)}
                            />
                            <span style={{ fontSize: '12px', color: '#dc2626', fontWeight: 'bold' }}>Hapus Ini</span>
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

        <div className="modal-actions" style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
          <div>
            <span style={{ color: '#4b5563' }}>
              Terpilih untuk dihapus: <strong style={{ color: '#dc2626' }}>{selectedForDeletion.length}</strong> soal
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="secondary-button" onClick={onClose}>
              Tutup
            </button>
            <button 
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedForDeletion.length === 0 || isDeleting}
              className="primary-button"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
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

import { useState, useEffect } from "react";
import { getSubjects, deleteSubject as deleteSubjectApi } from "../services/api";

export function useSubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      setLoadError("");
      const data = await getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Gagal mengambil mata pelajaran");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(subject) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus mata pelajaran "${subject.name}"?`
    );

    if (!confirmed) return;

    try {
      setActionError("");
      setActionSuccess("");

      const data = await deleteSubjectApi(subject.id);

      setActionSuccess(data.message || `Mata pelajaran "${subject.name}" berhasil dihapus`);
      await loadSubjects();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Gagal menghapus mata pelajaran");
    }
  }

  const filteredSubjects = subjects.filter((item) => {
    const keyword = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(keyword) ||
      item.name?.toLowerCase().includes(keyword) ||
      item.description?.toLowerCase().includes(keyword)
    );
  });

  return {
    subjects,
    loading,
    loadError,
    actionError,
    actionSuccess,
    search,
    setSearch,
    filteredSubjects,
    handleDelete,
    loadSubjects,
  };
}

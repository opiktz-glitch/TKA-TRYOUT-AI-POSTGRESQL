import { useState, useEffect } from "react";
import { getSubjects, deleteSubject as deleteSubjectApi } from "../services/api";
import toast from "react-hot-toast";

export function useSubjectManagement() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubjects();
  }, []);

  async function loadSubjects() {
    try {
      setLoading(true);
      const data = await getSubjects();
      setSubjects(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal mengambil mata pelajaran", { id: "load-subjects" });
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
      const data = await deleteSubjectApi(subject.id);
      toast.success(data.message || `Mata pelajaran "${subject.name}" berhasil dihapus`, { id: "delete-subject-success" });
      await loadSubjects();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus mata pelajaran", { id: "delete-subject-error" });
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
    search,
    setSearch,
    filteredSubjects,
    handleDelete,
    loadSubjects,
  };
}

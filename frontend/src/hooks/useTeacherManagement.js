import { useState, useEffect, useMemo } from "react";
import { getTeacherProfiles, deleteTeacherProfile } from "../services/api";
import toast from "react-hot-toast";

const TEACHERS_PER_PAGE = 10;

export function useTeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      setLoading(true);
      const data = await getTeacherProfiles();
      setTeachers(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal mengambil data guru", { id: "load-teachers" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(teacher) {
    const confirmed = window.confirm(
      `Hapus data guru "${teacher.full_name}"? Akun login-nya tidak akan ikut terhapus.`
    );

    if (!confirmed) return;

    try {
      await deleteTeacherProfile(teacher.id);
      toast.success(`Data guru "${teacher.full_name}" berhasil dihapus`, { id: "delete-teacher-success" });
      await loadTeachers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus data guru", { id: "delete-teacher-error" });
    }
  }

  const filteredTeachers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return teachers.filter((item) => {
      return (
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.teacher_code?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.school_name?.toLowerCase().includes(keyword)
      );
    });
  }, [teachers, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / TEACHERS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * TEACHERS_PER_PAGE;
    return filteredTeachers.slice(start, start + TEACHERS_PER_PAGE);
  }, [filteredTeachers, currentPage]);

  const hasActiveTeacherFilter = Boolean(search);

  function resetTeacherFilters() {
    setSearch("");
  }

  return {
    teachers,
    loading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedTeachers,
    filteredTeachersCount: filteredTeachers.length,
    hasActiveTeacherFilter,
    resetTeacherFilters,
    handleDelete,
    loadTeachers,
    TEACHERS_PER_PAGE,
  };
}

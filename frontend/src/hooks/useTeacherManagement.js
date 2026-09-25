import { useState, useEffect, useMemo } from "react";
import { getTeacherProfiles, deleteTeacherProfile } from "../services/api";

const TEACHERS_PER_PAGE = 10;

export function useTeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadTeachers();
  }, []);

  async function loadTeachers() {
    try {
      setLoading(true);
      setError("");
      const data = await getTeacherProfiles();
      setTeachers(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Gagal mengambil data guru");
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
      setActionError("");
      setActionSuccess("");
      await deleteTeacherProfile(teacher.id);
      setActionSuccess(`Data guru "${teacher.full_name}" berhasil dihapus`);
      await loadTeachers();

      setTimeout(() => {
        setActionSuccess("");
      }, 2500);
    } catch (err) {
      console.error(err);
      setActionError(err.message || "Gagal menghapus data guru");
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
    error,
    actionError,
    actionSuccess,
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

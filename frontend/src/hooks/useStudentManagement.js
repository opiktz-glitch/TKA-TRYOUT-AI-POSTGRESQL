import { useState, useEffect, useMemo } from "react";
import { getStudentProfiles, deleteStudentProfile } from "../services/api";
import toast from "react-hot-toast";

const STUDENTS_PER_PAGE = 10;

export function useStudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      setLoading(true);
      const data = await getStudentProfiles();
      setStudents(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal mengambil data siswa", { id: "load-students" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Hapus data siswa "${student.full_name}"? Akun login-nya tidak akan ikut terhapus.`
    );

    if (!confirmed) return;

    try {
      await deleteStudentProfile(student.id);
      toast.success(`Data siswa "${student.full_name}" berhasil dihapus`, { id: "delete-student-success" });
      await loadStudents();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus data siswa", { id: "delete-student-error" });
    }
  }

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return students.filter((item) => {
      return (
        !keyword ||
        item.full_name?.toLowerCase().includes(keyword) ||
        item.student_code?.toLowerCase().includes(keyword) ||
        item.username?.toLowerCase().includes(keyword) ||
        item.school_name?.toLowerCase().includes(keyword)
      );
    });
  }, [students, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / STUDENTS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * STUDENTS_PER_PAGE;
    return filteredStudents.slice(start, start + STUDENTS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const hasActiveStudentFilter = Boolean(search);

  function resetStudentFilters() {
    setSearch("");
  }

  return {
    students,
    loading,
    search,
    setSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedStudents,
    filteredStudentsCount: filteredStudents.length,
    hasActiveStudentFilter,
    resetStudentFilters,
    handleDelete,
    loadStudents,
    STUDENTS_PER_PAGE,
  };
}

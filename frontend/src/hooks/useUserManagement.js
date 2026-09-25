import { useState, useEffect, useMemo } from "react";
import { getUsers, deleteUser, forceLogoutUser } from "../services/api";
import toast from "react-hot-toast";

const USERS_PER_PAGE = 10;

export function useUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal mengambil data user", { id: "load-users" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user) {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus user "${user.username}"?`
    );

    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      toast.success(`User "${user.username}" berhasil dihapus`, { id: "delete-user-success" });
      await loadUsers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal menghapus user", { id: "delete-user-error" });
    }
  }

  async function handleForceLogout(user) {
    const confirmed = window.confirm(
      `Paksa logout user "${user.username}"? Sesi aktifnya di perangkat lain akan langsung berakhir, dan akun ini bisa langsung dipakai login lagi di tempat baru.`
    );

    if (!confirmed) return;

    try {
      await forceLogoutUser(user.id);
      toast.success(`Sesi user "${user.username}" berhasil di-logout paksa`, { id: "logout-user-success" });
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Gagal memaksa logout user", { id: "logout-user-error" });
    }
  }

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.username?.toLowerCase().includes(keyword) ||
        item.full_name?.toLowerCase().includes(keyword);

      const matchesRole = !roleFilter || item.role === roleFilter;

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "ACTIVE" ? item.is_active : !item.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const hasActiveUserFilter = Boolean(search || roleFilter || statusFilter);

  function resetUserFilters() {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
  }

  return {
    users,
    loading,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedUsers,
    filteredUsersCount: filteredUsers.length,
    hasActiveUserFilter,
    resetUserFilters,
    handleDelete,
    handleForceLogout,
    loadUsers,
    USERS_PER_PAGE,
  };
}

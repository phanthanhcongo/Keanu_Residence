import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Download, Loader2, Edit, Trash2, RotateCcw, Eye, EyeOff } from "lucide-react";
import { getUsers, updateUserRole, updateUserStatus, deleteUser, restoreUser, exportUsersCSV } from "../../services/adminService";
import UserModal from "../../components/admin/modals/UserModal";
import ConfirmModal from "../../components/admin/modals/ConfirmModal";
import NotificationModal from "../../components/NotificationModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

export default function Users() {
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [exporting, setExporting] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState<string | null>(null);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
        confirmText?: string;
    }>({ isOpen: false, title: "", message: "", onConfirm: () => { } });

    // Notification Modal State
    const [notifModal, setNotifModal] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false, title: "", message: ""
    });

    const showNotif = (title: string, message: string) => setNotifModal({ isOpen: true, title, message });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await getUsers(undefined, showDeleted);
            setUsers(response.data || []);
            setError(null);
        } catch (err: any) {
            setError(toUserErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [showDeleted]);

    const handleSave = async (id: string, newRole?: string, newStatus?: string) => {
        if (newRole) {
            await updateUserRole(id, newRole);
        }
        if (newStatus) {
            await updateUserStatus(id, { status: newStatus });
        }
        await fetchUsers();
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete User",
            message: "Are you sure you want to delete this user? This will mark them as inactive and soft-delete their data. They can be restored later.",
            isDestructive: true,
            confirmText: "Delete",
            onConfirm: async () => {
                setIsDeleting(id);
                try {
                    await deleteUser(id);
                    await fetchUsers();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to delete user"));
                } finally {
                    setIsDeleting(null);
                }
            },
        });
    };

    const handleRestore = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Restore User",
            message: "Are you sure you want to restore this user?",
            confirmText: "Restore",
            onConfirm: async () => {
                setIsRestoring(id);
                try {
                    await restoreUser(id);
                    await fetchUsers();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to restore user"));
                } finally {
                    setIsRestoring(null);
                }
            },
        });
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await exportUsersCSV();
        } catch (err: any) {
            showNotif("Export Failed", toUserErrorMessage(err, "Failed to export users CSV"));
        } finally {
            setExporting(false);
        }
    };

    const filteredUsers = users.filter(user => {
        if (user.role === 'SUPER_ADMIN') return false;

        const matchesSearch =
            (user.firstName?.toLowerCase().includes(search.toLowerCase()) || '') ||
            (user.lastName?.toLowerCase().includes(search.toLowerCase()) || '') ||
            (user.email?.toLowerCase().includes(search.toLowerCase()) || '');

        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const activeUsersCount = users.filter(u => !u.isDeleted && u.role !== 'SUPER_ADMIN').length;
    const inactiveCount = users.filter(u => !u.isDeleted && u.status === 'INACTIVE' && u.role !== 'SUPER_ADMIN').length;
    const adminCount = users.filter(u => !u.isDeleted && u.role === 'ADMIN').length;
    const deletedCount = users.filter(u => u.isDeleted && u.role !== 'SUPER_ADMIN').length;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-[38px] font-serif tracking-tight text-[#1C1C1C] mb-3">User Management</h1>
                    <p className="text-[#4B5563] text-[15px] leading-relaxed font-bold">
                        Manage all platform users, their roles, and system access.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto">
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center min-w-0 py-3 px-3 sm:px-4 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Active Users</span>
                        <span className="text-xl font-serif text-[#1C1C1C]">{activeUsersCount}</span>
                    </div>
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center min-w-0 py-3 px-3 sm:px-4 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Inactive</span>
                        <span className="text-xl font-serif text-[#A69279]">{inactiveCount}</span>
                    </div>
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center min-w-0 py-3 px-3 sm:px-4 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Admins</span>
                        <span className="text-xl font-serif text-[#1C1C1C]">{adminCount}</span>
                    </div>
                    {showDeleted && deletedCount > 0 && (
                        <div className="border border-red-200 bg-red-50 rounded flex flex-col items-center justify-center min-w-0 py-3 px-3 sm:px-4 shadow-sm">
                            <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider mb-1">Deleted</span>
                            <span className="text-xl font-serif font-black text-red-600">{deletedCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-gray-200 rounded p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="relative w-full md:w-[400px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-sm outline-none focus:border-[#A69279] transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="appearance-none bg-white px-4 py-2 pr-10 border border-gray-200 rounded text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors w-full md:w-auto outline-none focus:border-[#A69279]"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SALES">Sales</option>
                            <option value="BUYER">Buyer</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Show Deleted Toggle */}
                    <button
                        onClick={() => setShowDeleted(v => !v)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors border w-full lg:w-auto ${showDeleted
                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        title={showDeleted ? "Hide deleted users" : "Show deleted users"}
                    >
                        {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showDeleted ? "Hide Deleted" : "Show Deleted"}
                    </button>

                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors w-full lg:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm relative">
                {(isDeleting || isRestoring) && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                    </div>
                )}
                <div className="overflow-x-auto">
                    {loading && !isDeleting && !isRestoring ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl m-4 border border-red-100 shadow-sm">
                            {error}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-widest text-[#111827] font-bold bg-[#FAFAFA]">
                                    <th className="px-6 py-5">User</th>
                                    <th className="px-6 py-5">Role</th>
                                    <th className="px-6 py-5">Contact</th>
                                    <th className="px-6 py-5 text-center">Date Joined</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors group ${user.isDeleted ? 'opacity-50 bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A69279] to-[#8C7A63] text-white flex items-center justify-center font-serif text-lg shadow-inner">
                                                    {user.firstName ? user.firstName.charAt(0) : '?'}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-[#1C1C1C] text-[15px]">{user.firstName} {user.lastName}</div>
                                                        {user.isDeleted && (
                                                            <span className="text-[9px] uppercase font-bold bg-red-100 text-red-500 border border-red-200 px-1.5 py-0.5 rounded">Deleted</span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-0.5">ID: {user.id.substring(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded text-[11px] font-bold tracking-wide uppercase shadow-sm border
                                                ${user.role === 'SUPER_ADMIN' ? 'bg-[#1C1C1C] text-[#D4AF37] border-[#DAA520] shadow-[0_0_10px_rgba(212,175,55,0.2)]' :
                                                    user.role === 'ADMIN' ? 'bg-[#1C1C1C] text-[#E5D5BA] border-[#333]' :
                                                        user.role === 'SALES' ? 'bg-[#FDF8F0] text-[#A69279] border-[#E5D5BA]' :
                                                            'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[14px] text-[#4B5563] font-medium">{user.email}</div>
                                            <div className="text-gray-400 text-xs mt-0.5">{user.countryCode} {user.phoneNumber || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#4B5563] font-medium text-center">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isDeleted ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm bg-red-50 text-red-500 border-red-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                    Deleted
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-500' : user.status === 'BANNED' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                    <span className="text-[13px] font-bold text-gray-700">{user.status}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                {user.isDeleted ? (
                                                    <button
                                                        onClick={() => handleRestore(user.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                                        title="Restore user"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openEditModal(user)} className="text-[#A89882] hover:text-[#8D7F6D] transition-colors p-1 relative group/edit">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 font-bold">
                                            No users found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Status */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                    <div className="text-xs text-gray-500 font-medium">
                        Showing <span className="font-bold text-[#333]">1-{filteredUsers.length}</span> of {filteredUsers.length} Users
                        {showDeleted && deletedCount > 0 && (
                            <span className="ml-2 text-red-400">({deletedCount} deleted)</span>
                        )}
                    </div>
                </div>
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingUser}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDestructive={confirmModal.isDestructive}
                confirmText={confirmModal.confirmText}
            />

            <NotificationModal
                isOpen={notifModal.isOpen}
                onClose={() => setNotifModal(prev => ({ ...prev, isOpen: false }))}
                title={notifModal.title}
                message={notifModal.message}
            />
        </div>
    );
}

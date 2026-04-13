import React, { useState, useEffect } from "react";
import { Search, ChevronDown, Loader2, Plus, Edit, Trash2, RotateCcw, Eye, EyeOff } from "lucide-react";
import ConfirmModal from "../../components/admin/modals/ConfirmModal";
import NotificationModal from "../../components/NotificationModal";
import { getVillas, getProjects, createVilla, updateVilla, deleteVilla, restoreVilla } from "../../services/adminService";
import VillaModal from "../../components/admin/modals/VillaModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

export default function Villas() {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [projectFilter, setProjectFilter] = useState("ALL");
    const [villas, setVillas] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVilla, setEditingVilla] = useState<any>(null);
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [villasRes, projectsRes] = await Promise.all([
                getVillas(showDeleted),
                getProjects()
            ]);
            setVillas(villasRes.data || []);
            setProjects(projectsRes.data || []);
            setError(null);
        } catch (err: any) {
            setError(toUserErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [showDeleted]);

    const handleSave = async (data: any) => {
        if (editingVilla) {
            await updateVilla(editingVilla.id, data);
        } else {
            await createVilla(data);
        }
        await fetchData();
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Residence",
            message: "Are you sure you want to soft delete this residence? It can be restored later.",
            isDestructive: true,
            confirmText: "Delete",
            onConfirm: async () => {
                setIsDeleting(id);
                try {
                    await deleteVilla(id);
                    await fetchData();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to delete residence"));
                } finally {
                    setIsDeleting(null);
                }
            },
        });
    };

    const handleRestore = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Restore Residence",
            message: "Are you sure you want to restore this residence?",
            confirmText: "Restore",
            onConfirm: async () => {
                setIsRestoring(id);
                try {
                    await restoreVilla(id);
                    await fetchData();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to restore residence"));
                } finally {
                    setIsRestoring(null);
                }
            },
        });
    };

    const openCreateModal = () => {
        setEditingVilla(null);
        setIsModalOpen(true);
    };

    const openEditModal = (villa: any) => {
        setEditingVilla(villa);
        setIsModalOpen(true);
    };

    const filteredVillas = villas.filter(villa => {
        const matchesSearch =
            villa.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
            villa.unitType.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || villa.status === statusFilter;

        const matchesProject = projectFilter === "ALL" ||
            (villa.project?.id === projectFilter || villa.projectId === projectFilter);

        return matchesSearch && matchesStatus && matchesProject;
    });

    const availableCount = villas.filter(u => !u.isDeleted && u.status === 'AVAILABLE').length;
    const pendingCount = villas.filter(u => !u.isDeleted && u.status === 'RESERVED').length;
    const soldCount = villas.filter(u => !u.isDeleted && u.status === 'SOLD').length;
    const deletedCount = villas.filter(u => u.isDeleted).length;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="max-w-2xl">
                    <h1 className="text-3xl sm:text-[38px] font-serif tracking-tight text-[#1C1C1C] mb-3">Residence Control</h1>
                    <p className="text-[#4B5563] text-[15px] leading-relaxed font-bold">
                        Manage pricing, availability status, and view shortlist interest.
                    </p>
                </div>

                <div className={`grid gap-3 w-full xl:w-auto ${showDeleted && deletedCount > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center w-full py-3 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-600 tracking-[0.08em] leading-tight text-center px-2 mb-1 whitespace-nowrap">Available</span>
                        <span className="text-xl font-serif font-black text-[#8D7F6D]">{availableCount}</span>
                    </div>
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center w-full py-3 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-600 tracking-[0.08em] leading-tight text-center px-2 mb-1 whitespace-nowrap">Reserved</span>
                        <span className="text-xl font-serif font-black text-[#B7952B]">{pendingCount}</span>
                    </div>
                    <div className="border border-gray-200 bg-white rounded flex flex-col items-center justify-center w-full py-3 shadow-sm">
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-600 tracking-[0.08em] leading-tight text-center px-2 mb-1 whitespace-nowrap">Sold</span>
                        <span className="text-xl font-serif font-black text-[#2E7D32]">{soldCount}</span>
                    </div>
                    {showDeleted && deletedCount > 0 && (
                        <div className="border border-red-200 bg-red-50 rounded flex flex-col items-center justify-center w-full py-3 shadow-sm">
                            <span className="text-[9px] sm:text-[10px] uppercase font-bold text-red-500 tracking-[0.08em] leading-tight text-center px-2 mb-1 whitespace-nowrap">Deleted</span>
                            <span className="text-xl font-serif font-black text-red-600">{deletedCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-gray-200 rounded p-3 flex flex-col md:flex-row md:flex-nowrap items-stretch md:items-center justify-between gap-4">
                <div className="relative w-full md:w-[240px] lg:w-[280px] xl:w-[320px] shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Residence No or Config..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded text-sm outline-none focus:border-[#A69279] transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="appearance-none bg-white px-4 py-2 pr-10 border border-gray-200 rounded text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors w-full md:w-auto outline-none focus:border-[#A69279]"
                        >
                            <option value="ALL">All Projects</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="relative w-full md:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-white px-4 py-2 pr-10 border border-gray-200 rounded text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors w-full md:w-auto outline-none focus:border-[#A69279]"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="LOCKED">Locked</option>
                            <option value="RESERVED">Reserved</option>
                            <option value="SOLD">Sold</option>
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
                        title={showDeleted ? "Hide deleted residences" : "Show deleted residences"}
                    >
                        {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showDeleted ? "Hide Deleted" : "Show Deleted"}
                    </button>

                    <button onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-[#A89882] hover:bg-[#978670] text-white rounded text-sm font-medium transition-colors w-full lg:w-auto whitespace-nowrap">
                        <Plus className="w-4 h-4 shrink-0" />
                        <span className="whitespace-nowrap">Add Residence</span>
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
                                    <th className="px-6 py-5">Residence</th>
                                    <th className="px-6 py-5">Project</th>
                                    <th className="px-6 py-5">Config</th>
                                    <th className="px-6 py-5 text-center">Size</th>
                                    <th className="px-6 py-5 text-center">Price</th>
                                    <th className="px-6 py-5 text-center">Launch Price</th>
                                    <th className="px-6 py-5 text-center">Shortlists</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredVillas.map((item) => (
                                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors group ${item.isDeleted ? 'opacity-50 bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4 text-[15px] font-serif font-bold text-[#1C1C1C]">
                                            <div className="flex items-center gap-2">
                                                Residence {item.unitNumber}
                                                {item.isDeleted && (
                                                    <span className="text-[9px] uppercase font-bold bg-red-100 text-red-500 border border-red-200 px-1.5 py-0.5 rounded">Deleted</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">
                                            {item.project?.name || item.projectName || 'Default Project'}
                                        </td>
                                        <td className="px-6 py-4 text-[14px] text-[#4B5563] font-bold">{item.unitType}</td>
                                        <td className="px-6 py-4 text-[14px] text-[#4B5563] font-bold text-center">{Number(item.size).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-[14px] font-bold text-[#1C1C1C] text-center">${Number(item.price).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-[14px] font-bold text-gray-500 text-center">
                                            {item.launchPrice ? `$${Number(item.launchPrice).toLocaleString()} ` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${item.shortlistCount > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                                {item.shortlistCount || 0}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.isDeleted ? (
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm bg-red-50 text-red-500 border-red-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                    Deleted
                                                </div>
                                            ) : (
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm ${item.status === 'AVAILABLE' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    item.status === 'LOCKED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        item.status === 'RESERVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            item.status === 'SOLD' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                                'bg-gray-50 text-gray-500 border-gray-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'AVAILABLE' ? 'bg-green-600' :
                                                        item.status === 'LOCKED' ? 'bg-amber-500' :
                                                            item.status === 'RESERVED' ? 'bg-blue-600' :
                                                                item.status === 'SOLD' ? 'bg-purple-600' :
                                                                    'bg-gray-400'
                                                        }`}></span>
                                                    {item.status}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                {item.isDeleted ? (
                                                    <button
                                                        onClick={() => handleRestore(item.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                                        title="Restore residence"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openEditModal(item)} className="text-[#A89882] hover:text-[#8D7F6D] transition-colors p-1 relative group/edit">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVillas.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-8 text-center text-gray-500 font-bold">
                                            No residences found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination mock */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
                    <div className="text-xs text-gray-500 font-medium">
                        Showing <span className="font-bold text-[#333]">1-{filteredVillas.length}</span> of {filteredVillas.length} Residences
                        {showDeleted && deletedCount > 0 && (
                            <span className="ml-2 text-red-400">({deletedCount} deleted)</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-400 font-medium cursor-not-allowed">Previous</button>
                        <button className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-400 font-medium cursor-not-allowed">Next</button>
                    </div>
                </div>
            </div>

            <VillaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingVilla}
                title={editingVilla ? "Edit Residence" : "Create New Residence"}
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

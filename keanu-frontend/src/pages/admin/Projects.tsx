import React, { useEffect, useState } from "react";
import { Briefcase, Loader2, Edit, Calendar, Trash2, Star, RotateCcw, Eye, EyeOff } from "lucide-react";
import { getProjects, createProject, updateProject, deleteProject, restoreProject } from "../../services/adminService";
import ProjectModal from "../../components/admin/modals/ProjectModal";
import ConfirmModal from "../../components/admin/modals/ConfirmModal";
import NotificationModal from "../../components/NotificationModal";
import { toUserErrorMessage } from "../../utils/errorMessage";

export default function Projects() {
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
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

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await getProjects(showDeleted);
            setProjects(response.data || []);
            setError(null);
        } catch (err: any) {
            setError(toUserErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, [showDeleted]);

    const handleSave = async (data: any) => {
        if (editingProject) {
            await updateProject(editingProject.id, data);
        } else {
            await createProject(data);
        }
        await fetchProjects();
    };

    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Delete Project",
            message: "Soft delete this project? All its units will also be soft deleted. You can restore it later.",
            isDestructive: true,
            confirmText: "Delete",
            onConfirm: async () => {
                setIsDeleting(id);
                try {
                    await deleteProject(id);
                    await fetchProjects();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to delete project"));
                } finally {
                    setIsDeleting(null);
                }
            },
        });
    };

    const handleRestore = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Restore Project",
            message: "Restore this project and all its units?",
            confirmText: "Restore",
            onConfirm: async () => {
                setIsRestoring(id);
                try {
                    await restoreProject(id);
                    await fetchProjects();
                } catch (err: any) {
                    showNotif("Error", toUserErrorMessage(err, "Failed to restore project"));
                } finally {
                    setIsRestoring(null);
                }
            },
        });
    };

    const openCreateModal = () => {
        setEditingProject(null);
        setIsModalOpen(true);
    };

    const openEditModal = (project: any) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "UPCOMING":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "LIVE":
                return "bg-green-100 text-green-800 border-green-200";
            case "CLOSED":
                return "bg-gray-100 text-gray-800 border-gray-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const activeCount = projects.filter(p => !p.isDeleted).length;
    const deletedCount = projects.filter(p => p.isDeleted).length;

    return (
        <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-12">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6">
                <div className="max-w-2xl">
                    <h1 className="text-3xl sm:text-[38px] font-serif tracking-tight text-[#1C1C1C] mb-3">Projects (Masterplan)</h1>
                    <p className="text-[#4B5563] text-[15px] leading-relaxed font-bold">
                        Manage masterplan projects, configurations, and launch timings.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                    {/* Show Deleted Toggle */}
                    <button
                        onClick={() => setShowDeleted(v => !v)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border w-full sm:w-auto ${showDeleted
                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                        title={showDeleted ? "Hide deleted projects" : "Show deleted projects"}
                    >
                        {showDeleted ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showDeleted ? `Hide Deleted${deletedCount > 0 ? ` (${deletedCount})` : ''}` : "Show Deleted"}
                    </button>
                    <button onClick={openCreateModal} className="bg-[#A89882] hover:bg-[#978670] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-[#A89882]/20 w-full sm:w-auto">
                        Add Project
                    </button>
                </div>
            </div>

            {loading && !isDeleting && !isRestoring ? (
                <div className="flex items-center justify-center h-64 border border-gray-100 rounded-2xl bg-white shadow-sm">
                    <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                </div>
            ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 shadow-sm">
                    {error}
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                        <div className="text-center">
                            <Briefcase className="mx-auto h-12 w-12 text-[#A89882]/60" />
                            <h3 className="mt-4 text-sm font-bold text-[#1C1C1C]">No Projects Found</h3>
                            <button onClick={openCreateModal} className="mt-4 px-6 py-2 border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-white transition-colors">
                                Create Draft
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm relative">
                    {(isDeleting || isRestoring) && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#A89882]" />
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-gray-100 text-[11px] uppercase tracking-widest text-[#111827] font-bold bg-[#FAFAFA]">
                                    <th className="px-6 py-5">Project</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-center">Featured</th>
                                    <th className="px-6 py-5">Launch Details</th>
                                    <th className="px-6 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {projects.map((project) => (
                                    <tr key={project.id} className={`hover:bg-gray-50 transition-colors group ${project.isDeleted ? 'opacity-50 bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                                                    {project.heroImageUrl ? (
                                                        <img src={project.heroImageUrl} alt={project.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Briefcase className="w-5 h-5 text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-bold text-[#1C1C1C] text-[15px]">{project.name}</div>
                                                        {project.isDeleted && (
                                                            <span className="text-[9px] uppercase font-bold bg-red-100 text-red-500 border border-red-200 px-1.5 py-0.5 rounded">Deleted</span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-400 text-xs mt-0.5">{project.developer}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getStatusStyles(project.status)} shadow-sm`}>
                                                {project.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {project.isPrimary ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FDF8F0] text-[#A69279] border border-[#E5D5BA] rounded text-[10px] font-bold uppercase tracking-wide">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    Primary
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 text-[10px] font-bold uppercase tracking-wide">Standard</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-[13px] text-[#4B5563] font-medium">
                                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                                {new Date(project.launchDate).toLocaleDateString()}
                                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">{project.launchTime}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 transition-opacity">
                                                {project.isDeleted ? (
                                                    <button
                                                        onClick={() => handleRestore(project.id)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                                                        title="Restore project and all its units"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => openEditModal(project)} title="Edit Project" className="p-2 border border-[#EBEAE6] bg-[#F5F5F4] text-[#A89882] rounded-lg hover:bg-[#EBEAE6] hover:text-[#1C1C1C] transition-all">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(project.id)} title="Soft Delete Project" className="p-2 border border-red-50 text-red-400 rounded-lg hover:bg-white hover:text-red-600 transition-all bg-red-50/30">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {showDeleted && (
                        <div className="px-6 py-3 border-t border-gray-100 bg-[#FAFAFA] text-xs text-gray-400 font-medium">
                            Showing {activeCount} active + {deletedCount} deleted project{deletedCount !== 1 ? 's' : ''}. Deleted projects and all their units are hidden from regular users.
                        </div>
                    )}
                </div>
            )}

            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingProject}
                title={editingProject ? "Edit Project" : "Create New Project"}
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

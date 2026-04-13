import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { getProjects } from "../../../services/adminService";
import { toUserErrorMessage } from "../../../utils/errorMessage";

interface VillaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    initialData?: any;
    title: string;
}

export default function VillaModal({ isOpen, onClose, onSave, initialData, title }: VillaModalProps) {
    const [formData, setFormData] = useState({
        projectId: "",
        unitNumber: "",
        unitType: "Type I",
        floor: "",
        size: "",
        bedrooms: "",
        bathrooms: "",
        price: "",
        launchPrice: "",
        status: "AVAILABLE",
        description: "",
        floorPlanUrl: "",
        imageUrls: "",
        features: "",
        // Feature fields (stored in features JSON)
        land: "",
        levels: "2 Storey + Rooftop",
        configuration: "",
        tenure: "Leasehold (48 years)",
        leasehold: "48",
        pool: "",
        terrace: "",
        groundFloor: "",
        upperFloor: "",
        rooftopArea: "",
        garden: "",
        guestSuite: "No",
        office: "No",
        rooftop: "No",
        // Text content fields
        livingConcept: "",
        setting: "",
        distinctiveFeatures: "",
        keyInclusions: "",
        serviceArea: "",
        // Position & misc
        xPosition: "",
        yPosition: "",
        shortlistCount: "",
    });

    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchProjects();
        }
    }, [isOpen]);

    const fetchProjects = async () => {
        setProjectsLoading(true);
        try {
            const res = await getProjects();
            setProjects(res.data || []);
        } catch (err: any) {
            setError("Failed to load projects list.");
        } finally {
            setProjectsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && initialData) {
            const feat = initialData.features || {};
            const parsed = typeof feat === 'string' ? (() => { try { return JSON.parse(feat); } catch { return {}; } })() : feat;

            // Extract known fields from features, keep the rest as generic JSON
            const {
                land, pool, leasehold, terrace, levels, configuration, tenure,
                groundFloor, upperFloor, rooftopArea, garden,
                office, guestSuite, rooftop,
                livingConcept, setting, distinctiveFeatures, keyInclusions, serviceArea,
                // Legacy fields to ignore
                structure: _structure, serviceWing: _serviceWing, beds: _beds,
                ...restFeatures
            } = parsed;

            setFormData({
                projectId: initialData.projectId || "",
                unitNumber: initialData.unitNumber || "",
                unitType: initialData.unitType || "Type I",
                floor: initialData.floor != null ? String(initialData.floor) : "",
                size: initialData.size != null ? String(initialData.size) : "",
                bedrooms: initialData.bedrooms != null ? String(initialData.bedrooms) : "",
                bathrooms: initialData.bathrooms != null ? String(initialData.bathrooms) : "",
                price: initialData.price != null ? String(initialData.price) : "",
                launchPrice: initialData.launchPrice != null ? String(initialData.launchPrice) : "",
                status: initialData.status || "AVAILABLE",
                description: initialData.description || "",
                floorPlanUrl: initialData.floorPlanUrl || "",
                imageUrls: Array.isArray(initialData.imageUrls) ? initialData.imageUrls.join("\n") : "",
                features: Object.keys(restFeatures).length > 0 ? JSON.stringify(restFeatures, null, 2) : "",
                land: land != null ? String(land) : "",
                levels: levels || "2 Storey + Rooftop",
                configuration: configuration || "",
                tenure: tenure || "Leasehold (48 years)",
                leasehold: leasehold != null ? String(leasehold) : "48",
                pool: pool != null ? String(pool) : "",
                terrace: terrace != null ? String(terrace) : "",
                groundFloor: groundFloor != null ? String(groundFloor) : "",
                upperFloor: upperFloor != null ? String(upperFloor) : "",
                rooftopArea: rooftopArea != null ? String(rooftopArea) : "",
                garden: garden != null ? String(garden) : "",
                guestSuite: guestSuite ? "Yes" : "No",
                office: office ? "Yes" : "No",
                rooftop: rooftop ? "Yes" : "No",
                livingConcept: livingConcept || "",
                setting: setting || "",
                distinctiveFeatures: distinctiveFeatures || "",
                keyInclusions: keyInclusions || "",
                serviceArea: serviceArea || "",
                xPosition: initialData.xPosition != null ? String(initialData.xPosition) : "",
                yPosition: initialData.yPosition != null ? String(initialData.yPosition) : "",
                shortlistCount: initialData.shortlistCount != null ? String(initialData.shortlistCount) : "",
            });
            setError(null);
        } else if (isOpen && !initialData) {
            setFormData({
                projectId: projects.length > 0 ? projects[0].id : "",
                unitNumber: "",
                unitType: "Type I",
                floor: "",
                size: "",
                bedrooms: "",
                bathrooms: "",
                price: "",
                launchPrice: "",
                status: "AVAILABLE",
                description: "",
                floorPlanUrl: "",
                imageUrls: "",
                features: "",
                land: "",
                levels: "2 Storey + Rooftop",
                configuration: "",
                tenure: "Leasehold (48 years)",
                leasehold: "48",
                pool: "",
                terrace: "",
                groundFloor: "",
                upperFloor: "",
                rooftopArea: "",
                garden: "",
                guestSuite: "No",
                office: "No",
                rooftop: "No",
                livingConcept: "",
                setting: "",
                distinctiveFeatures: "",
                keyInclusions: "",
                serviceArea: "",
                xPosition: "",
                yPosition: "",
                shortlistCount: "",
            });
            setError(null);
        }
    }, [isOpen, initialData, projects]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!formData.projectId) {
            setError("Please select a project.");
            return;
        }

        setLoading(true);
        try {
            const payload = { ...formData } as any;

            // Convert numeric string fields to numbers
            const numberFields = ['floor', 'size', 'bedrooms', 'bathrooms', 'price', 'launchPrice', 'xPosition', 'yPosition', 'shortlistCount'];
            for (const field of numberFields) {
                payload[field] = payload[field] !== '' ? Number(payload[field]) : 0;
            }

            // Format arrays and JSON
            if (payload.imageUrls) {
                payload.imageUrls = typeof payload.imageUrls === 'string'
                    ? payload.imageUrls.split('\n').map((url: string) => url.trim()).filter(Boolean)
                    : payload.imageUrls;
            } else {
                payload.imageUrls = [];
            }

            // Build features: merge all feature fields into features JSON
            let featuresObj: Record<string, any> = {};
            if (payload.features && typeof payload.features === 'string') {
                try {
                    featuresObj = JSON.parse(payload.features);
                } catch (e) {
                    // If not valid JSON, ignore
                }
            } else if (payload.features && typeof payload.features === 'object') {
                featuresObj = payload.features;
            }

            // Merge numeric feature fields
            if (payload.land !== '') featuresObj.land = Number(payload.land);
            if (payload.pool !== '') featuresObj.pool = Number(payload.pool);
            if (payload.leasehold !== '') featuresObj.leasehold = Number(payload.leasehold);
            if (payload.terrace !== '') featuresObj.terrace = Number(payload.terrace);
            if (payload.groundFloor !== '') featuresObj.groundFloor = Number(payload.groundFloor);
            if (payload.upperFloor !== '') featuresObj.upperFloor = Number(payload.upperFloor);
            if (payload.rooftopArea !== '') featuresObj.rooftopArea = Number(payload.rooftopArea);
            if (payload.garden !== '') featuresObj.garden = Number(payload.garden);

            // String feature fields
            if (payload.levels) featuresObj.levels = payload.levels;
            if (payload.configuration) featuresObj.configuration = payload.configuration;
            if (payload.tenure) featuresObj.tenure = payload.tenure;

            // Boolean feature fields
            featuresObj.guestSuite = payload.guestSuite === 'Yes';
            featuresObj.office = payload.office === 'Yes';
            featuresObj.rooftop = payload.rooftop === 'Yes';

            // Text content fields
            if (payload.livingConcept) featuresObj.livingConcept = payload.livingConcept;
            if (payload.setting) featuresObj.setting = payload.setting;
            if (payload.distinctiveFeatures) featuresObj.distinctiveFeatures = payload.distinctiveFeatures;
            if (payload.keyInclusions) featuresObj.keyInclusions = payload.keyInclusions;
            if (payload.serviceArea) featuresObj.serviceArea = payload.serviceArea;

            // Compute beds from bedrooms + guestSuite
            featuresObj.beds = (payload.bedrooms !== '' ? Number(payload.bedrooms) : 0) + (featuresObj.guestSuite ? 1 : 0);

            payload.features = featuresObj;

            // Remove the separate fields from payload (they're in features now)
            const featureKeys = [
                'land', 'pool', 'leasehold', 'terrace', 'levels', 'configuration', 'tenure',
                'groundFloor', 'upperFloor', 'rooftopArea', 'garden',
                'guestSuite', 'office', 'rooftop',
                'livingConcept', 'setting', 'distinctiveFeatures', 'keyInclusions', 'serviceArea',
            ];
            for (const key of featureKeys) {
                delete payload[key];
            }

            await onSave(payload);
            onClose();
        } catch (err: any) {
            setError(toUserErrorMessage(err, "Failed to save residence"));
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper for section headers
    const SectionHeader = ({ children }: { children: React.ReactNode }) => (
        <div className="md:col-span-3 pt-4 pb-1 border-t border-gray-100 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-bold text-[#A89882] uppercase tracking-wider">{children}</h3>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-5xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-serif text-[#1C1C1C]">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form id="unit-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* ── Basic Info ── */}
                            <SectionHeader>Basic Information</SectionHeader>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Project Masterplan</label>
                                <select
                                    name="projectId"
                                    value={formData.projectId}
                                    onChange={handleChange}
                                    disabled={projectsLoading}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none disabled:bg-gray-50 disabled:opacity-75"
                                >
                                    <option value="" disabled>Select a project</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Residence Number</label>
                                <input required type="text" name="unitNumber" value={formData.unitNumber} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 2A" />
                                <p className="text-[10px] text-gray-400 italic">A=Type I, B=Type II, C=Type III, D=Type IV</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Residence Type</label>
                                <select name="unitType" value={formData.unitType} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="Type I">Type I</option>
                                    <option value="Type II">Type II</option>
                                    <option value="Type III">Type III</option>
                                    <option value="Type IV">Type IV</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="AVAILABLE">Available</option>
                                    <option value="RESERVED">Reserved</option>
                                    <option value="SOLD">Sold</option>
                                    <option value="LOCKED">Locked</option>
                                    <option value="UNAVAILABLE">Not Available</option>
                                </select>
                            </div>

                            {/* ── Pricing ── */}
                            <SectionHeader>Pricing</SectionHeader>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Current Price (USD)</label>
                                <input required type="text" inputMode="decimal" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 1000000" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Launch Price (USD)</label>
                                <input type="text" inputMode="decimal" name="launchPrice" value={formData.launchPrice} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 999999" />
                            </div>

                            {/* ── Specs ── */}
                            <SectionHeader>Specifications</SectionHeader>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Interior Area (sq m)</label>
                                <input required type="text" inputMode="decimal" name="size" value={formData.size} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 448" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Land Area (sq m)</label>
                                <input type="text" inputMode="decimal" name="land" value={formData.land} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 670" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Levels</label>
                                <select name="levels" value={formData.levels} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="2 Storey + Rooftop">2 Storey + Rooftop</option>
                                    <option value="Single-storey">Single-storey</option>
                                    <option value="2 Storey">2 Storey</option>
                                    <option value="3 Storey">3 Storey</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Configuration</label>
                                <input type="text" name="configuration" value={formData.configuration} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 3 BR + Guest Suite" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Bedrooms</label>
                                <input required type="text" inputMode="numeric" name="bedrooms" value={formData.bedrooms} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 3" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Bathrooms</label>
                                <input required type="text" inputMode="decimal" name="bathrooms" value={formData.bathrooms} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 8" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Tenure</label>
                                <input type="text" name="tenure" value={formData.tenure} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. Leasehold (48 years)" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Leasehold (years)</label>
                                <input type="text" inputMode="numeric" name="leasehold" value={formData.leasehold} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="48" />
                            </div>

                            {/* ── Amenities ── */}
                            <SectionHeader>Amenities</SectionHeader>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Guest Suite</label>
                                <select name="guestSuite" value={formData.guestSuite} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Office / Study</label>
                                <select name="office" value={formData.office} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Rooftop Terrace</label>
                                <select name="rooftop" value={formData.rooftop} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none">
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                </select>
                            </div>

                            {/* ── Area Breakdown ── */}
                            <SectionHeader>Area Breakdown (sq m)</SectionHeader>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Ground Floor</label>
                                <input type="text" inputMode="decimal" name="groundFloor" value={formData.groundFloor} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 208" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Upper Floor</label>
                                <input type="text" inputMode="decimal" name="upperFloor" value={formData.upperFloor} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 190" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Rooftop Area</label>
                                <input type="text" inputMode="decimal" name="rooftopArea" value={formData.rooftopArea} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 50" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Terrace</label>
                                <input type="text" inputMode="decimal" name="terrace" value={formData.terrace} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 110" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Pool (sq m)</label>
                                <input type="text" inputMode="decimal" name="pool" value={formData.pool} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 80" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Landscaped Garden</label>
                                <input type="text" inputMode="decimal" name="garden" value={formData.garden} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="e.g. 210" />
                            </div>

                            {/* ── Content ── */}
                            <SectionHeader>Content &amp; Descriptions</SectionHeader>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Opening Description</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="Short opening description for the residence..."></textarea>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Living Concept</label>
                                <textarea name="livingConcept" value={formData.livingConcept} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="Describe the living concept and spatial arrangement..."></textarea>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Setting</label>
                                <textarea name="setting" value={formData.setting} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="Describe the setting and position within the estate..."></textarea>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Distinctive Features</label>
                                <textarea name="distinctiveFeatures" value={formData.distinctiveFeatures} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="• Feature one&#10;• Feature two&#10;• Feature three"></textarea>
                                <p className="text-[10px] text-gray-400 italic">Use bullet points (•) for each feature, one per line.</p>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Key Inclusions</label>
                                <textarea name="keyInclusions" value={formData.keyInclusions} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="Private swimming pool&#10;Landscaped garden&#10;..."></textarea>
                                <p className="text-[10px] text-gray-400 italic">One inclusion per line.</p>
                            </div>

                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-gray-700">Service Area</label>
                                <textarea name="serviceArea" value={formData.serviceArea} onChange={handleChange} rows={3} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="Staff bedroom with ensuite&#10;Separate wet kitchen&#10;..."></textarea>
                            </div>

                            {/* ── Media ── */}
                            <SectionHeader>Media</SectionHeader>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Image URLs (One per line)</label>
                                <textarea name="imageUrls" value={formData.imageUrls} onChange={handleChange} rows={6} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none text-xs" placeholder="https://image1.jpg&#10;https://image2.jpg"></textarea>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Floor Plan URL</label>
                                <input type="text" name="floorPlanUrl" value={formData.floorPlanUrl} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="https://..." />
                            </div>

                            {/* ── Advanced ── */}
                            <SectionHeader>Advanced</SectionHeader>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Floor</label>
                                <input type="text" inputMode="numeric" name="floor" value={formData.floor} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">X Position (Map)</label>
                                <input type="text" inputMode="numeric" name="xPosition" value={formData.xPosition} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Y Position (Map)</label>
                                <input type="text" inputMode="numeric" name="yPosition" value={formData.yPosition} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="0" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Shortlist Count</label>
                                <input type="text" inputMode="numeric" name="shortlistCount" value={formData.shortlistCount} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none" placeholder="0" />
                                <p className="text-[10px] text-gray-400 italic">Manual override. Increment/decrement syncs with user actions.</p>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-700">Extra Features (JSON Format)</label>
                                <textarea name="features" value={formData.features} onChange={handleChange} rows={4} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-[#A89882] outline-none font-mono text-xs" placeholder='{"customField": "value"}'></textarea>
                                <p className="text-[10px] text-gray-400 italic">Additional custom features not covered by the fields above.</p>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-auto">
                    <button type="button" onClick={onClose} disabled={loading} className="w-full sm:w-auto px-6 py-2 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-white transition-colors disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="submit" form="unit-form" disabled={loading} className="w-full sm:w-auto px-6 py-2 bg-[#A89882] text-white font-bold rounded-lg hover:bg-[#978670] transition-colors shadow-lg shadow-[#A89882]/20 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Residence
                    </button>
                </div>
            </div>
        </div>
    );
}

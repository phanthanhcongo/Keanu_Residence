import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, MapPin, Download, Play, ArrowRight, FileText, Lock, Plus, Minus } from 'lucide-react';
import "./About.css";

// --- Components ---

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string, key?: React.Key }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
        className={className}
    >
        {children}
    </motion.div>
);

const Hero = ({ onEnquire, onExplore }: { onEnquire: () => void, onExplore: () => void }) => {
    return (
        <section id="essence" className="relative h-screen w-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[#292524]">
                <img
                    src="/images/unit_images/17.png"
                    alt="Keanu Residences Exterior"
                    className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
            </div>

            <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2 }}
                >
                    <span className="eyebrow text-white/80 mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">Essence of Keanu</span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl text-white font-light font-serif leading-[1.1] mb-6">
                        Beachfront Residences<br />in a Gated Enclave
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-light mb-2">A limited collection of 10</p>
                    <p className="text-sm md:text-base text-white/70 font-light tracking-wide mb-12">By Private Introduction — Keramas, Bali</p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onEnquire}
                            className="bg-white text-[#1c1917] px-8 py-4 text-[10px] tracking-widest uppercase hover:bg-white/90 transition-colors w-full sm:w-auto font-medium"
                        >
                            Enquire Privately
                        </button>
                        <button
                            onClick={onExplore}
                            className="bg-transparent border border-white/30 text-white px-8 py-4 text-[10px] tracking-widest uppercase hover:border-white transition-colors w-full sm:w-auto font-medium"
                        >
                            Explore the Estate
                        </button>
                    </div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer"
                onClick={() => {
                    const editorial = document.getElementById('editorial');
                    editorial?.scrollIntoView({ behavior: 'smooth' });
                }}
            >
                <ChevronDown size={24} />
            </motion.div>
        </section>
    );
};

const Editorial = () => {
    return (
        <section id="editorial" className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-center">
                <div className="lg:col-span-5 order-2 lg:order-1">
                    <FadeIn>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-8 text-[#1c1917] font-serif">
                            More than a view,<br />
                            <span className="italic text-[#78716c]">A year-round address</span>
                        </h2>
                        <div className="space-y-6 text-[#57534e] font-light text-lg leading-relaxed">
                            <p>
                                Keanu is conceived as a private residential estate on Bali's sunrise coast — bringing together low-density planning, architectural coherence, and long-term liveability.
                            </p>
                            <p>
                                Every part of the estate is designed to support daily life: privacy, proportion, coastal durability, and a quieter rhythm of ownership.
                            </p>
                        </div>

                        <div className="mt-12 pt-12 border-t border-[#e6e4e0] grid grid-cols-2 gap-8">
                            <div>
                                <div className="text-2xl font-serif text-[#1c1917] mb-2">10</div>
                                <div className="text-[10px] tracking-widest uppercase text-[#8b857c] font-medium">Private Residences</div>
                            </div>
                            <div>
                                <div className="text-2xl font-serif text-[#1c1917] mb-2">100m</div>
                                <div className="text-[10px] tracking-widest uppercase text-[#8b857c] font-medium">Beachfront Frontage</div>
                            </div>
                        </div>
                    </FadeIn>
                </div>

                <div className="lg:col-span-7 order-1 lg:order-2">
                    <FadeIn delay={0.2}>
                        <div className="aspect-[4/5] md:aspect-[3/2] lg:aspect-[4/5] overflow-hidden rounded-sm shadow-xl">
                            <img
                                src="/images/unit_images/53.png"
                                alt="Interior architectural detail"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                            />
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
};

const Standards = () => {
    const features = [
        {
            title: "Gated residential estate",
            desc: "A low-density, stewarded enclave designed to preserve privacy, calm, and long-term residential quality."
        },
        {
            title: "Central residential pavilion",
            desc: "A shared social anchor for families to gather, children to play, and neighbours to connect naturally."
        },
        {
            title: "Shared standards",
            desc: "Clear estate standards help protect the residential rhythm and preserve continuity over time."
        },
        {
            title: "Privacy by design",
            desc: "Spatial planning, controlled access, and layered landscaping reinforce the feeling of a private neighbourhood."
        }
    ];

    return (
        <section id="standards" className="py-24 md:py-32 bg-[#f5f4f2]">
            <div className="max-w-7xl mx-auto px-6 font-sans">
                <div className="max-w-3xl mx-auto text-center mb-20">
                    <FadeIn>
                        <span className="eyebrow text-[#8b857c] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">The Community</span>
                        <h2 className="text-4xl md:text-5xl mb-8 text-[#1c1917] font-serif">Community & Estate Standards</h2>
                        <p className="text-lg text-[#57534e] font-light leading-relaxed">
                            Keanu is conceived as a residential community, not a transient destination. Estate standards are designed to protect livability, spatial quality, and long-term value over time. The masterplan prioritises low density, generous spacing, and continuity between residences.
                        </p>
                    </FadeIn>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    {features.map((feature, idx) => (
                        <FadeIn key={idx} delay={idx * 0.1} className="flex flex-col">
                            <div className="h-px w-12 bg-[#1c1917] mb-6"></div>
                            <h3 className="text-xl font-serif text-[#1c1917] mb-4 italic">{feature.title}</h3>
                            <p className="text-[#78716c] font-light text-sm leading-relaxed">{feature.desc}</p>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
};

const LocationSection = () => {
    const [scale, setScale] = useState(1);
    return (
        <section id="location" className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div>
                    <FadeIn>
                        <span className="eyebrow text-[#8b857c] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">Location</span>
                        <h2 className="text-4xl md:text-5xl mb-8 text-[#1c1917] font-serif">At the heart of it all</h2>
                        <p className="text-lg text-[#57534e] font-light leading-relaxed mb-12">
                            Set on Bali's sunrise coast, Keanu Residences offers a quiet return home while remaining within practical reach of Sanur and Ubud. A short drive to essentials, international schools, and leading healthcare.
                        </p>

                        <div className="space-y-6 mb-12">
                            {[
                                { name: "Sanur", time: "30 mins", category: "Lifestyle" },
                                { name: "Dyatmika School", time: "15 mins", category: "Education" },
                                { name: "Bali Safari", time: "5 mins", category: "Family" },
                                { name: "Ngurah Rai Int. Airport", time: "55 mins", category: "Transport" }
                            ].map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center border-b border-[#e6e4e0] pb-4">
                                    <div>
                                        <div className="text-[#1c1917] font-medium">{item.name}</div>
                                        <div className="text-[10px] text-[#8b857c] uppercase tracking-wider mt-1">{item.category}</div>
                                    </div>
                                    <div className="text-[#57534e] font-serif italic">{item.time}</div>
                                </div>
                            ))}
                        </div>

                        <button className="flex items-center space-x-2 text-[10px] tracking-widest uppercase text-[#1c1917] hover:text-[#8b857c] transition-colors group font-medium">
                            <span>Open Interactive Map</span>
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </FadeIn>
                </div>

                <div className="relative h-[500px] lg:h-[700px] rounded-sm overflow-hidden group cursor-grab active:cursor-grabbing shadow-xl bg-[#292524]">
                    <FadeIn delay={0.2} className="w-full h-full relative">
                        <motion.div
                            drag
                            dragConstraints={{
                                top: -600 * (scale - 1),
                                bottom: 600 * (scale - 1),
                                left: -600 * (scale - 1),
                                right: 600 * (scale - 1)
                            }}
                            dragElastic={0.1}
                            animate={{ scale }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <img
                                src="/images/masterplan/map.png"
                                alt="Map of Keanu Residences Location"
                                className="max-w-full max-h-full object-contain opacity-100 pointer-events-none select-none"
                            />
                        </motion.div>

                        <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
                            <button
                                onClick={() => setScale(prev => Math.min(prev + 0.5, 4))}
                                className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#1c1917] hover:bg-white transition-colors shadow-lg"
                            >
                                <Plus size={20} />
                            </button>
                            <button
                                onClick={() => setScale(prev => Math.max(prev - 0.5, 1))}
                                className="w-10 h-10 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#1c1917] hover:bg-white transition-colors shadow-lg"
                            >
                                <Minus size={20} />
                            </button>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-colors">
                                <MapPin className="text-white" size={24} />
                            </div>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md p-6 rounded-sm pointer-events-none">
                            <div className="text-[10px] tracking-widest uppercase text-[#8b857c] mb-1 font-medium">Keramas, Bali</div>
                            <div className="text-lg font-serif text-[#1c1917]">Sunrise Coast</div>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
};

const Team = () => {
    const team = [
        {
            name: "Charlie Hearn",
            company: "Inspiral Studios",
            role: "Lead Architect",
            desc: "Oversees Keanu's architectural vision, from masterplan to long-term liveability",
            img: "/images/team/Charlie New Profile Picture.jpg"
        },
        {
            name: "PAZ Studio",
            company: "Interior Design Partner",
            role: "Interiors",
            desc: "Designing interiors for long-term living — quiet proportions, tactile materials, and comfort that holds up to coastal life",
            img: "/images/team/PAZ team.jpg"
        },
        {
            name: "Anton Clark",
            company: "Bali Landscape Company",
            role: "Landscape Architect",
            desc: "Conceiving the landscape as natural privacy infrastructure — integrating shade, screening, drainage, and coastal planting that matures gracefully over time.",
            img: "/images/team/Anton Clark.jpeg"
        },
        {
            name: "Bernhard Thompson",
            company: "One Stop Solution",
            role: "Project Construction Manager",
            desc: "Ensuring predictability and disciplined delivery through rigorous coordination and risk management.",
            img: "/images/team/Bernhanrd Thompson.png"
        }
    ];

    return (
        <section id="team" className="py-24 md:py-32 bg-[#1c1917] text-white">
            <div className="max-w-7xl mx-auto px-6">
                <div className="max-w-3xl mb-20">
                    <FadeIn>
                        <span className="eyebrow text-[#a8a29e] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">The Creators</span>
                        <h2 className="text-4xl md:text-5xl mb-8 font-serif">Authored by a Small, Intentional Team</h2>
                        <p className="text-lg text-[#d5d2cd] font-light leading-relaxed">
                            Keanu is shaped through collaboration between architecture, interiors, and landscape — each contributing to a cohesive and enduring residential environment.
                        </p>
                    </FadeIn>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {team.map((member, idx) => (
                        <FadeIn key={idx} delay={idx * 0.1}>
                            <div className="group">
                                <div className="aspect-[3/4] overflow-hidden mb-6 bg-[#292524] rounded-sm">
                                    <img
                                        src={member.img}
                                        alt={member.name}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 grayscale group-hover:grayscale-0"
                                    />
                                </div>
                                <div className="text-[10px] tracking-widest uppercase text-[#a8a29e] mb-2 font-medium">{member.company}</div>
                                <h3 className="text-xl font-serif mb-1 italic">{member.name}</h3>
                                <div className="text-sm text-[#d5d2cd] italic mb-4">{member.role}</div>
                                <p className="text-sm text-[#a8a29e] font-light leading-relaxed">{member.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Advisors = ({ onEnquire }: { onEnquire: () => void }) => {
    return (
        <section className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <div className="order-2 lg:order-1">
                    <FadeIn className="relative aspect-video bg-[#e6e4e0] rounded-sm overflow-hidden group cursor-pointer shadow-xl">
                        <img
                            src="https://images.unsplash.com/photo-1556761175-5973dc0f32b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80"
                            alt="Advisors meeting"
                            className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center pl-1 shadow-lg group-hover:scale-110 transition-transform">
                                <Play className="text-[#1c1917]" size={20} fill="currentColor" />
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-6 text-white text-sm font-medium drop-shadow-md">
                            Meet the Bali Nexus advisory team
                        </div>
                    </FadeIn>
                </div>

                <div className="order-1 lg:order-2">
                    <FadeIn delay={0.2}>
                        <span className="eyebrow text-[#8b857c] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">Representation</span>
                        <h2 className="text-4xl md:text-5xl mb-8 text-[#1c1917] font-serif">Guided by Private Advisors</h2>
                        <p className="text-lg text-[#57534e] font-light leading-relaxed mb-8">
                            Keanu is represented by a dedicated advisory team with local expertise and international perspective, supporting buyers through a structured and transparent process.
                        </p>

                        <ul className="space-y-4 mb-10">
                            {[
                                "Private buyer guidance",
                                "Structured allocation process",
                                "Local market understanding",
                                "International buyer perspective",
                                "Transparent next steps"
                            ].map((item, idx) => (
                                <li key={idx} className="flex items-start space-x-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#8c7b66] mt-2 flex-shrink-0" />
                                    <span className="text-[#57534e] text-sm">{item}</span>
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={onEnquire}
                            className="bg-[#1c1917] text-white px-8 py-4 text-[10px] tracking-widest uppercase hover:bg-[#292524] transition-colors font-medium"
                        >
                            Book Private Introduction
                        </button>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
};

const Dossier = ({ onEnquire }: { onEnquire: () => void }) => {
    const docs = [
        { title: "Project Brochure", desc: "Comprehensive overview of the estate" },
        { title: "Project Factsheet", desc: "Technical specifications and sizing" },
        { title: "Legal & Tax Book", desc: "Ownership structure and compliance" },
        { title: "Reid's Report", desc: "Bali Luxury Property market analysis" }
    ];

    return (
        <section className="py-24 md:py-32 bg-[#f5f4f2]">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
                    <FadeIn>
                        <span className="eyebrow text-[#8b857c] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">Materials</span>
                        <h2 className="text-4xl md:text-5xl text-[#1c1917] mb-4 font-serif">Confidential Project Dossier</h2>
                        <p className="text-[#78716c] font-serif italic text-xl">Private materials for considered review</p>
                    </FadeIn>
                    <FadeIn delay={0.2}>
                        <p className="text-[10px] text-[#8b857c] max-w-xs uppercase tracking-widest leading-relaxed font-medium">
                            Shared for private review. Full details and availability are confirmed through direct discussion.
                        </p>
                    </FadeIn>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {docs.map((doc, idx) => (
                        <FadeIn key={idx} delay={idx * 0.1}>
                            <div
                                onClick={onEnquire}
                                className="bg-white p-8 rounded-sm border border-[#e6e4e0] hover:border-[#8c7b66] transition-colors group cursor-pointer h-full flex flex-col shadow-sm hover:shadow-md"
                            >
                                <div className="flex justify-between items-start mb-12">
                                    <FileText className="text-[#8c7b66]" size={24} />
                                    <span className="text-[10px] tracking-widest uppercase bg-[#f5f4f2] px-2 py-1 text-[#78716c] rounded-sm flex items-center gap-1 font-medium">
                                        <Lock size={10} /> Private
                                    </span>
                                </div>
                                <div className="mt-auto">
                                    <h3 className="text-lg font-serif text-[#1c1917] mb-2 italic">{doc.title}</h3>
                                    <p className="text-sm text-[#78716c] font-light mb-6">{doc.desc}</p>
                                    <div className="flex items-center space-x-2 text-[10px] tracking-widest uppercase text-[#1c1917] group-hover:text-[#8c7b66] transition-colors font-medium">
                                        <Download size={14} />
                                        <span>Download PDF</span>
                                    </div>
                                </div>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
};

const FAQ = () => {
    const faqs = [
        {
            q: "Is Keanu intended for residential living or short-stay use?",
            a: "Keanu is strictly conceived as a private residential estate. While owners have flexibility, the design, standards, and community structure are built to support long-term living rather than transient, hotel-style occupancy."
        },
        {
            q: "What makes Keanu different from hospitality-led developments?",
            a: "Unlike resort-branded residences, Keanu prioritises privacy, lower density, and residential continuity. There are no transient hotel guests sharing the amenities, ensuring a quieter, more stable environment."
        },
        {
            q: "What ownership structure applies to the residences?",
            a: "Ownership structures are tailored to comply with Indonesian law while providing security for international and domestic buyers. Full details are provided in the Legal & Tax Book within the confidential dossier."
        },
        {
            q: "What estate standards are in place to protect long-term quality?",
            a: "Comprehensive estate standards govern architectural modifications, landscaping, noise, and usage to ensure the estate matures gracefully and property values are protected over time."
        },
        {
            q: "How does the private introduction and allocation process work?",
            a: "Residences are allocated through a structured, private process to ensure alignment with the community vision. Interested parties begin with a confidential advisory call."
        }
    ];

    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <section className="py-24 md:py-32 px-6 max-w-4xl mx-auto">
            <FadeIn>
                <div className="text-center mb-16">
                    <span className="eyebrow text-[#8b857c] mb-6 block font-medium tracking-[0.2em] uppercase text-[10px]">Inquiries</span>
                    <h2 className="text-4xl md:text-5xl text-[#1c1917] font-serif">Common Questions</h2>
                </div>

                <div className="space-y-4 font-sans">
                    {faqs.map((faq, idx) => (
                        <div key={idx} className="border-b border-[#e6e4e0] pb-4">
                            <button
                                className="w-full flex justify-between items-center py-4 text-left focus:outline-none group"
                                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                            >
                                <span className={`text-lg font-serif italic transition-colors ${openIdx === idx ? 'text-[#8c7b66]' : 'text-[#1c1917] group-hover:text-[#57534e]'}`}>
                                    {faq.q}
                                </span>
                                <span className="text-[#8b857c] ml-4 flex-shrink-0">
                                    {openIdx === idx ? <Minus size={18} /> : <Plus size={18} />}
                                </span>
                            </button>
                            <AnimatePresence>
                                {openIdx === idx && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <p className="pb-6 text-[#57534e] font-light leading-relaxed pr-8 text-sm">
                                            {faq.a}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </FadeIn>
        </section>
    );
};

const CTA = ({ onEnquire, onDossier }: { onEnquire: () => void, onDossier: () => void }) => {
    return (
        <section className="py-32 bg-[#1c1917] text-center px-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
                <img
                    src="/images/unit_images/39.png"
                    alt="Keanu Residences Pool Side"
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="relative z-10 max-w-3xl mx-auto">
                <FadeIn>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl text-white font-light font-serif leading-[1.1] mb-8">
                        For those who value space, continuity, and long-term liveability.
                    </h2>
                    <p className="text-lg text-[#a8a29e] font-light mb-12 max-w-2xl mx-auto">
                        Keanu is offered by private introduction to a limited number of buyers seeking a more considered residential address in Bali.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onEnquire}
                            className="bg-white text-[#1c1917] px-8 py-4 text-[10px] tracking-widest uppercase hover:bg-[#e6e4e0] transition-colors w-full sm:w-auto font-medium"
                        >
                            Enquire Privately
                        </button>
                        <button
                            onClick={onDossier}
                            className="bg-transparent border border-white/30 text-white px-8 py-4 text-[10px] tracking-widest uppercase hover:border-white transition-colors w-full sm:w-auto font-medium"
                        >
                            Download Dossier
                        </button>
                    </div>
                </FadeIn>
            </div>
        </section>
    );
};

export default function About() {
    const navigate = useNavigate();

    const handleEnquire = () => navigate('/contact');
    const handleExplore = () => navigate('/masterplan');
    const handleDossier = () => {
        // For now, dossier also leads to contact as it's private materials
        navigate('/contact');
    };

    return (
        <div className="about-page min-h-screen bg-[#faf9f8] selection:bg-[#8c7b66] selection:text-white font-sans">
            <Hero onEnquire={handleEnquire} onExplore={handleExplore} />
            <Editorial />
            <Standards />
            <LocationSection />
            <Team />
            <Advisors onEnquire={handleEnquire} />
            <Dossier onEnquire={handleEnquire} />
            <FAQ />
            <CTA onEnquire={handleEnquire} onDossier={handleDossier} />
        </div>
    );
}

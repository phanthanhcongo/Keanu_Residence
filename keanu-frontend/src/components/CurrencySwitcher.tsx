import React, { useState, useRef, useEffect } from 'react';
import { useCurrency, type SupportedCurrency } from '../contexts/CurrencyContext';
import { ChevronDown } from 'lucide-react';

const CURRENCY_OPTIONS: { value: SupportedCurrency; label: string; flagCode: string }[] = [
    { value: 'USD', label: 'USD', flagCode: 'us' },
    { value: 'AUD', label: 'AUD', flagCode: 'au' },
    { value: 'EUR', label: 'EUR', flagCode: 'eu' },
    { value: 'SGD', label: 'SGD', flagCode: 'sg' },
    { value: 'HKD', label: 'HKD', flagCode: 'hk' },
    { value: 'AED', label: 'AED', flagCode: 'ae' },
];

interface CurrencySwitcherProps {
    isDarkTheme?: boolean;
}

export function CurrencySwitcher({ isDarkTheme = false }: CurrencySwitcherProps) {
    const { currency, setCurrency, isConnected } = useCurrency();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = CURRENCY_OPTIONS.find(opt => opt.value === currency) || CURRENCY_OPTIONS[0];

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (val: SupportedCurrency) => {
        setCurrency(val);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={toggleDropdown}
                className={`
                    flex items-center gap-2 px-2.5 py-1.5 rounded-sm border transition-all duration-300
                    font-display text-[10px] tracking-[0.12em] uppercase font-bold
                    ${isDarkTheme
                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/40'
                        : 'bg-white border-[#EBEAE5] text-[#1A1A1A] hover:border-[#A89B8C] hover:bg-[#F9F9F7]'
                    }
                `}
            >
                {/* Connection Dot */}
                <span
                    className={`w-1 h-1 rounded-full shrink-0 ${isConnected ? 'bg-green-400' : 'bg-gray-300 animate-pulse'}`}
                    title={isConnected ? 'Live rates connected' : 'Connecting to live rates...'}
                />

                {/* Flag Icon */}
                <img
                    src={`https://flagcdn.com/w40/${selectedOption.flagCode}.png`}
                    alt={selectedOption.label}
                    className="w-[14px] h-auto object-contain rounded-[1px] shadow-sm"
                />

                <span>{selectedOption.label}</span>

                <ChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDarkTheme ? 'text-white/50' : 'text-[#A89B8C]'}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`
                        absolute right-0 mt-2 w-40 z-[100] border shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200
                        ${isDarkTheme
                            ? 'bg-[#1A1A1A]/95 backdrop-blur-md border-white/10'
                            : 'bg-white/95 backdrop-blur-md border-[#EBEAE5]'
                        }
                    `}
                >
                    <div className="py-1 max-h-64 overflow-y-auto custom-scrollbar">
                        {CURRENCY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => handleSelect(opt.value)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left
                                    font-display text-[10px] tracking-[0.15em] uppercase font-bold
                                    ${currency === opt.value
                                        ? (isDarkTheme ? 'bg-white/10 text-white' : 'bg-[#F5F2EBE5] text-[#A69279]')
                                        : (isDarkTheme ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-[#6B7280] hover:text-[#A69279] hover:bg-[#F9F9F7]')
                                    }
                                `}
                            >
                                <img
                                    src={`https://flagcdn.com/w40/${opt.flagCode}.png`}
                                    alt={opt.label}
                                    className="w-[16px] h-auto object-contain rounded-[1px]"
                                />
                                <span className="flex-1">{opt.label}</span>
                                {currency === opt.value && <div className="w-1 h-1 rounded-full bg-current" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

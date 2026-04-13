import React, { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentFormProps {
    reservationId: string;
    email?: string;
}

export default function PaymentForm({ reservationId, email }: PaymentFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const navigate = useNavigate();

    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const navigateToFailedCheckout = (reason?: string) => {
        const search = reason
            ? `?${new URLSearchParams({ reason }).toString()}`
            : '';
        navigate(`/checkout/failed/${reservationId}${search}`, { replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Note: elements.submit() is NOT needed here because we are using confirmPayment
            // with a clientSecret already provided to the Elements provider.
            // Calling it manually can cause the payment flow to hang prematurely.

            const { error: submitError, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: `${window.location.origin}/checkout/success/${reservationId}`,
                    payment_method_data: email ? {
                        billing_details: {
                            email: email
                        }
                    } : undefined
                },
                redirect: 'if_required',
            });

            if (submitError) {
                const message = submitError.message || 'An unexpected error occurred.';
                setError(message);
                setIsProcessing(false);
                return;
            }

            if (paymentIntent?.status === 'requires_payment_method' || paymentIntent?.status === 'canceled') {
                const message = 'Checkout failed. Please try another payment method.';
                setError(message);
                setIsProcessing(false);
                return;
            }

            if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
                const params = new URLSearchParams({
                    redirect_status: paymentIntent.status === 'succeeded' ? 'succeeded' : 'processing',
                    payment_intent: paymentIntent.id,
                });
                navigate(`/checkout/success/${reservationId}?${params.toString()}`, { replace: true });
                return;
            }

            // For other states, keep the user on the current page with a message.
            setError('Unable to confirm payment status. Please try again.');
            setIsProcessing(false);
        } catch (err: any) {
            console.error('Payment confirmation error:', err);
            setError(err.message || 'An unexpected error occurred during payment.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="w-full bg-white p-5 sm:p-8 lg:p-10 xl:p-12 shadow-xl border border-[#EBE9E1]">
            <div className="flex justify-between items-start mb-8">
                <h3 className="font-serif text-[22px] text-[#2A332C] leading-tight tracking-wider uppercase">SECURE <br /> CHECKOUT</h3>
                <div className="flex items-center gap-1.5 text-[#A0A29F] pt-1">
                    <Lock size={12} />
                    <span className="font-display text-[9px] tracking-[0.15em] uppercase">ENCRYPTED</span>
                </div>
            </div>

            <form className="w-full space-y-8" onSubmit={handleSubmit}>

                {/* Stripe PaymentElement — full width matching button */}
                <div className="w-full [&_.p-PaymentElement]:w-full [&_.p-PaymentElement]:max-w-none [&_.p-Field]:w-full [&_.p-Input]:w-full">
                    <PaymentElement
                        className="w-full"
                        options={{
                            layout: {
                                type: 'accordion',
                                defaultCollapsed: false,
                                radios: false,
                                spacedAccordionItems: false,
                            },
                            fields: {
                                billingDetails: {
                                    email: 'never',
                                },
                            },
                            terms: {
                                card: 'never',
                            },
                        }}
                    />
                </div>

                {/* Inline error */}
                {error && (
                    <p className="text-[11px] text-[#a05050] tracking-wide">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="w-full flex items-center justify-center group py-5 px-8 bg-[#1a1814] text-[#f0e8d6] font-display text-[10px] tracking-[0.2em] uppercase hover:bg-[#2e2a24] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md relative mt-4"
                >
                    <span className="absolute left-1/2 -translate-x-1/2 w-max">
                        {isProcessing ? 'PROCESSING...' : 'CONFIRM RESERVATION'}
                    </span>
                    {!isProcessing && <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform ml-auto" />}
                </button>

                <div className="pt-6 pb-2 mt-4 flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2 text-[#A0A29F] font-display text-[10px] tracking-widest uppercase">
                        <span style={{ marginRight: '-3px' }}>Powered by</span>
                        <img src="/images/stripe_logo.png" alt="Stripe" className="h-[27px] opacity-90 object-contain" />
                    </div>
                    <p className="text-[9px] text-center text-[#A0A29F] leading-relaxed mx-4 font-lato">
                        By confirming, you agree to Keanu Residences' <a href="#" className="underline hover:text-[#2A332C] transition-colors">Terms of Service</a> and <a href="#" className="underline hover:text-[#2A332C] transition-colors">Privacy Policy</a>. All transactions are secure and encrypted.
                    </p>
                </div>

            </form>
        </div>
    );
}

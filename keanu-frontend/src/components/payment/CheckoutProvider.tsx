import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CheckoutProviderProps {
    children: React.ReactNode;
    clientSecret: string;
}

export default function CheckoutProvider({ children, clientSecret }: CheckoutProviderProps) {
    if (!clientSecret) {
        return <>{children}</>;
    }

    const options = {
        clientSecret,
        locale: 'en' as const,
        fonts: [
            {
                cssSrc: 'https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500&display=swap',
            },
        ],
        appearance: {
            theme: 'none' as const,
            variables: {
                fontFamily: '"Jost", sans-serif',
                fontWeightNormal: '400',
                fontSizeBase: '14px',
                fontSizeSm: '11px',
                fontSizeXs: '10px',

                colorBackground: '#ffffff',
                colorPrimary: '#b4945a',
                colorText: '#1a1814',
                colorTextSecondary: '#9a8f80',
                colorTextPlaceholder: '#c0b8a8',
                colorDanger: '#a05050',

                borderRadius: '0px',
                spacingUnit: '4px',
                spacingGridRow: '28px',
                spacingGridColumn: '16px',

                colorIconTab: '#9a8f80',
                colorIconTabSelected: '#b4945a',
                colorIconTabHover: '#b4945a',
            },
            rules: {
                // ── Force full width on Stripe's internal container ──
                '.p-PaymentElement': {
                    width: '100%',
                },
                '.p-Field': {
                    width: '100%',
                },

                // ── Section labels ──
                '.Label': {
                    fontSize: '9px',
                    fontWeight: '500',
                    letterSpacing: '0.25em',
                    textTransform: 'uppercase',
                    color: '#9a8f80',
                    marginBottom: '12px',
                    fontFamily: '"Jost", sans-serif',
                },

                // ── Inputs: underline only, no border box ──
                '.Input': {
                    padding: '13px 0px',
                    fontSize: '14px',
                    fontWeight: '400',
                    fontFamily: '"Jost", sans-serif',
                    color: '#1a1814',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #d4c4a0',
                    borderRadius: '0px',
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                },
                '.Input:focus': {
                    border: 'none',
                    borderBottom: '1px solid #b4945a',
                    boxShadow: 'none',
                    outline: 'none',
                },
                '.Input:hover': {
                    borderBottom: '1px solid #c8a86a',
                },
                '.Input--invalid': {
                    border: 'none',
                    borderBottom: '1px solid #a05050',
                    color: '#a05050',
                    boxShadow: 'none',
                },
                '.Input::placeholder': {
                    color: '#c0b8a8',
                    fontWeight: '300',
                },

                // ── Error ──
                '.Error': {
                    color: '#a05050',
                    fontSize: '11px',
                    letterSpacing: '0.04em',
                    marginTop: '6px',
                },

                // ── Block: xóa grey box Stripe tự thêm quanh card fields ──
                '.Block': {
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    border: 'none',
                    borderRadius: '0px',
                    padding: '0px',
                },

                // ── Accordion items ──
                '.AccordionItem': {
                    border: 'none',
                    borderBottom: 'none',
                    borderRadius: '0px',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                },
                '.AccordionItem--selected': {
                    backgroundColor: 'transparent',
                    borderBottom: 'none',
                },

                // ── Remove trailing separator line after last field group ──
                '.p-FieldGroup': {
                    borderBottom: 'none',
                    boxShadow: 'none',
                },

                // ── Tabs ──
                '.Tab': {
                    border: 'none',
                    borderBottom: '2px solid transparent',
                    borderRadius: '0px',
                    padding: '10px 0px',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                    color: '#9a8f80',
                    fontSize: '10px',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                },
                '.Tab:hover': {
                    borderBottom: '2px solid #c8a86a',
                    color: '#1a1814',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                },
                '.Tab--selected': {
                    borderBottom: '2px solid #b4945a',
                    color: '#1a1814',
                    backgroundColor: 'transparent',
                    boxShadow: 'none',
                },
                '.Tab--selected:focus': {
                    boxShadow: 'none',
                },
                '.TabIcon--selected': {
                    fill: '#b4945a',
                },
                '.TabLabel--selected': {
                    color: '#1a1814',
                },

                // ── Select / Dropdown (Country field) ──
                '.Select': {
                    padding: '13px 0px',
                    fontSize: '14px',
                    fontWeight: '400',
                    fontFamily: '"Jost", sans-serif',
                    color: '#1a1814',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid #d4c4a0',
                    borderRadius: '0px',
                    boxShadow: 'none',
                },
                '.Select:focus': {
                    border: 'none',
                    borderBottom: '1px solid #b4945a',
                    boxShadow: 'none',
                    outline: 'none',
                },

                // ── Checkbox ──
                '.Checkbox': {
                    borderColor: '#d4c4a0',
                    borderRadius: '0px',
                },
                '.Checkbox--checked': {
                    backgroundColor: '#b4945a',
                    borderColor: '#b4945a',
                },
            },
        },
    };

    return (
        <Elements stripe={stripePromise} options={options}>
            {children}
        </Elements>
    );
}

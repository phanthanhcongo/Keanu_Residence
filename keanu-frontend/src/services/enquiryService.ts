import { fetchWithAuth } from "../utils/api";

export interface EnquiryPayload {
    fullName: string;
    email: string;
    phone: string;
    property?: string;
    inquiryType: string;
    message?: string;
    contactViaWhatsApp?: boolean;
}

export interface EnquiryResponse {
    success: boolean;
    message: string;
}

export async function submitEnquiry(payload: EnquiryPayload): Promise<EnquiryResponse> {
    return fetchWithAuth<EnquiryResponse>("/v1/integrations/ghl/contacts/enquiry", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

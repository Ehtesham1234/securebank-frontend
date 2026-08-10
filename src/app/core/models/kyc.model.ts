/**
 * Mirrors com.ehtesham.kyc_service.enums.KycDocumentType.
 */
export type KycDocumentType = 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENSE';

/** Display labels + select-list order for KycDocumentType — used by both
 *  the customer submit form and the teller review list. */
export const KYC_DOCUMENT_TYPE_OPTIONS: { value: KycDocumentType; label: string }[] = [
  { value: 'AADHAAR', label: 'Aadhaar Card' },
  { value: 'PAN', label: 'PAN Card' },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENSE', label: 'Driving License' },
];

/**
 * Mirrors com.ehtesham.kyc_service.enums.KycStatus.
 */
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/**
 * Mirrors com.ehtesham.kyc_service.dto.KycResponse. Returned by both
 * POST /kyc/submit and GET /kyc/status (customer), and as list items from
 * GET /teller/kyc/pending.
 *
 * Note: `userId` is all the backend gives you to identify the customer —
 * there's no name/email on this DTO and no endpoint to join one in. The
 * teller review UI shows "User #<id>" rather than fabricate a name.
 */
export interface KycResponse {
  id: number;
  userId: number;
  documentType: KycDocumentType;
  documentNumber: string;
  status: KycStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The `data` part of the multipart POST /kyc/submit request — the file
 *  itself is a separate `file` part, see KycService.submit(). */
export interface KycSubmitRequest {
  documentType: KycDocumentType;
  documentNumber: string;
}

/** POST /teller/kyc/{id}/reject body */
export interface KycRejectRequest {
  reason: string;
}

/** Mirrors KycServiceImpl's validateKycFile — client-side check so the user
 *  gets instant feedback instead of a round trip, but the backend re-checks
 *  actual file content (magic bytes), not just the extension, so this is a
 *  convenience, not the real gate. */
export const KYC_ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
export const KYC_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

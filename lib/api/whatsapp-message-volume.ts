import { apiFetch, ApiError } from './client';
import { parseWhatsappMessageVolume } from './analytics-parse';
import type { WhatsappMessageVolume } from '@/lib/types';

export { parseWhatsappMessageVolume } from './analytics-parse';

export async function getWhatsappMessageVolume(
  days: 7 | 14 | 30,
): Promise<WhatsappMessageVolume> {
  const body = await apiFetch<unknown>(
    `/admin/whatsapp-messages/volume?days=${days}`,
  );
  const parsed = parseWhatsappMessageVolume(body);
  if (!parsed.ok) {
    throw new ApiError(
      200,
      'WhatsApp volume response did not match the expected shape',
    );
  }
  return parsed.data;
}

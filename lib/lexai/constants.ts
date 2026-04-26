import type { SupportedLanguage } from './types';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string; nativeLabel: string }[] = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
];

export const INTAKE_FIELDS = [
    'Full legal name, any other names used, date of birth, place of birth',
    'Citizenship(s) and any stateless status',
    'Current address in Canada, arrival date in Canada',
    'Immediate family (spouse, children, parents, siblings) — names, dates of birth, current location',
    'Education history (schools, years, locations)',
    'Employment history (employers, roles, years, locations)',
    'Address history for the past 10 years',
    'Travel history (countries visited, dates, purposes) for the past 10 years',
    'Languages spoken',
];

export const DISCLOSURE: Record<SupportedLanguage, string> = {
    en: 'You are speaking with a computer program, not a lawyer. Everything you share will be reviewed by your lawyer. You can stop at any time — there is no rush.',
    hi: 'आप एक कंप्यूटर प्रोग्राम से बात कर रहे हैं, किसी वकील से नहीं। आप जो कुछ भी बताएंगे, वह आपके वकील द्वारा देखा जाएगा। आप जब चाहें रुक सकते हैं — कोई जल्दी नहीं है।',
};

export const BEGIN_SIGNAL = '[BEGIN]';

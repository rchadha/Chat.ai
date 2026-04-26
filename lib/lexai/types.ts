export type SupportedLanguage = 'en' | 'hi';

export type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export type FamilyMember = {
    relationship: string;
    name: string;
    dateOfBirth: string | null;
    currentLocation: string | null;
};

export type EducationEntry = {
    institution: string;
    location: string;
    years: string;
    credential: string | null;
};

export type EmploymentEntry = {
    employer: string;
    role: string;
    location: string;
    years: string;
};

export type AddressEntry = {
    address: string;
    country: string;
    fromYear: string;
    toYear: string;
};

export type TravelEntry = {
    country: string;
    dates: string;
    purpose: string | null;
};

export type IntakeData = {
    legalName: string | null;
    otherNames: string[] | null;
    dateOfBirth: string | null;
    placeOfBirth: string | null;
    citizenships: string[] | null;
    currentAddressCanada: string | null;
    arrivalDateCanada: string | null;
    familyMembers: FamilyMember[] | null;
    educationHistory: EducationEntry[] | null;
    employmentHistory: EmploymentEntry[] | null;
    addressHistory: AddressEntry[] | null;
    travelHistory: TravelEntry[] | null;
    languagesSpoken: string[] | null;
    notesForLawyer: string[];
};

export type TranscriptEntry = {
    role: 'user' | 'assistant';
    original: string;
    english: string;
};

export type SummaryResult = {
    summary: string;
    transcript: TranscriptEntry[];
};

export const EMPTY_INTAKE_DATA: IntakeData = {
    legalName: null,
    otherNames: null,
    dateOfBirth: null,
    placeOfBirth: null,
    citizenships: null,
    currentAddressCanada: null,
    arrivalDateCanada: null,
    familyMembers: null,
    educationHistory: null,
    employmentHistory: null,
    addressHistory: null,
    travelHistory: null,
    languagesSpoken: null,
    notesForLawyer: [],
};

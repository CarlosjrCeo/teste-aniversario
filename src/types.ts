export interface GuestMember {
  id: string;
  name: string;
  isAttending: boolean | null; // null = pending response, true = will attend, false = won't attend
  dietaryRestrictions?: string;
  isChild?: boolean;
}

export interface FamilyGroup {
  id: string;
  familyName: string;
  isSolo?: boolean; // true if solo individual guest without family
  members: GuestMember[];
  lastUpdated?: string;
  confirmedBy?: string;
  message?: string;
  phone?: string;
}

export interface PartySettings {
  title: string;
  subtitle: string;
  eventDate: string; // YYYY-MM-DD
  eventTime: string; // HH:mm
  locationName: string;
  address: string;
  mapsUrl?: string;
  deadlineDate: string; // YYYY-MM-DD
  welcomeMessage: string;
  adminPin: string;
  heroImageUrl?: string;
}

export interface PartyData {
  settings: PartySettings;
  families: FamilyGroup[];
}

export interface RsvpSubmissionPayload {
  familyId: string;
  confirmedBy: string;
  members: {
    id: string;
    isAttending: boolean;
    dietaryRestrictions?: string;
  }[];
  message?: string;
  phone?: string;
}

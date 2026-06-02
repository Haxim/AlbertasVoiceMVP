export type Role = "CAPTAIN" | "ADMIN";
export type InviteStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "UNSUBSCRIBED";
export type Preference = "ALL_UPDATES" | "WEEKLY_DIGEST" | "VOTE_REMINDER_ONLY";
export type PreferenceFilter = Preference | "ALL";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  created_at: string;
};

export type Invite = {
  id: string;
  captain_id: string;
  invitee_name: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  token: string;
  status: InviteStatus;
  created_at: string;
  accepted_at: string | null;
  declined_at: string | null;
};

export type Subscriber = {
  id: string;
  invite_id: string | null;
  captain_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  normalized_email: string | null;
  normalized_phone: string | null;
  preference: Preference;
  sms_consent: boolean;
  email_consent: boolean;
  consented_at: string | null;
  unsubscribed_at: string | null;
  subscription_token: string;
  created_at: string;
  updated_at: string;
};

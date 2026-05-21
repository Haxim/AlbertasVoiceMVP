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

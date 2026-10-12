// One list, used by BOTH the website dropdown and the server validation.
// Add or rename project types here and both sides stay in sync.
export const PROJECT_TYPES = [
  "Nursing Home or Skilled Nursing Facility Remodel",
  "Assisted Living Facility",
  "Americans with Disabilities Act Bathroom Upgrades",
  "Dining and Common Area",
  "Office Build-Out",
  "Retail or Restaurant",
  "Medical or Clinic Office",
  "New Commercial Construction",
  "Project Management",
  "Commercial Re-Roofing",
  "Residential Roofing",
  "Storm Damage or Emergency Repair",
  "Other",
];

// Field size limits shared by the form and the server.
export const LIMITS = {
  firstName: 60,
  lastName: 60,
  email: 254,
  phone: 30,
  projectType: 80,
  message: 3000,
};

// Names can't carry links, email addresses, or markup. Stops spammers from
// using the "we got your message" email to mail their links to strangers.
export const NAME_NOT_ALLOWED = /https?:|www\.|@|[<>]|\b[a-z0-9-]+\.(com|net|org|info|biz|io|co|us|ru|xyz|top|site|online|link|app|shop|click|live|me)\b/i;
export const NAME_ERROR = "Please enter just your name.";

// A human can't fill the form faster than this. Faster = bot.
export const MIN_FILL_MS = 2500;

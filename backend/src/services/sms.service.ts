import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken  = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export async function sendAppointmentSms(params: {
  toPhone: string;
  candidateName: string;
  date: string;       // e.g. "27 May 2026"
  time: string;       // e.g. "09:00"
  locationName: string;
  locationAddress?: string | null;
  jobRole: string;
}): Promise<void> {
  if (!accountSid || !authToken || !fromNumber) {
    console.warn('[SMS] Twilio env vars missing — skipping SMS');
    return;
  }

  const { toPhone, candidateName, date, time, locationName, locationAddress, jobRole } = params;

  const firstName = candidateName.split(' ')[0];
  const addressLine = locationAddress ? `\nAddress: ${locationAddress}` : '';
  const body =
    `Hello ${firstName}! Your interview for ${jobRole} has been scheduled.\n` +
    `Date: ${date}\nTime: ${time}\nLocation: ${locationName}${addressLine}\n` +
    `Please arrive 10 minutes early. Good luck!`;

  const client = twilio(accountSid, authToken);

  await client.messages.create({ body, from: fromNumber, to: toPhone });
}

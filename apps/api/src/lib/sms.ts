import { config } from "../config";

export async function sendSms(phone: string, message: string): Promise<void> {
  if (!config.msg91AuthKey) {
    console.log(`[SMS dev] ${phone}: ${message}`);
    return;
  }

  const otpMatch = message.match(/\b(\d{6})\b/);
  const otp = otpMatch?.[1];
  if (!otp) {
    console.warn("[SMS] Could not extract OTP from message — skipping MSG91 call");
    return;
  }

  try {
    const response = await fetch("https://api.msg91.com/api/v5/otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: config.msg91AuthKey,
      },
      body: JSON.stringify({
        template_id: config.msg91TemplateId,
        mobile: `91${phone}`,
        otp,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[SMS] MSG91 error (${response.status}): ${text}`);
    }
  } catch (err) {
    console.warn("[SMS] MSG91 request failed:", (err as Error).message);
  }
}

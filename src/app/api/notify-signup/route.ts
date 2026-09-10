import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { userEmail } = await request.json();

    const senderEmail =
      process.env.RESEND_FROM_EMAIL || 'KlicEvent <bonjour@klicevent.com>';

    await resend.emails.send({
      from: senderEmail,
      to: ['julvantard@gmail.com'],
      subject: `🎉 Nouveau compte créé : ${userEmail}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a; padding: 24px;">
            <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="color: #7c3aed; margin-top: 0;">Nouveau compte KlicEvent !</h2>
              <p style="font-size: 14px; color: #475569;">Un nouvel utilisateur vient de s'inscrire sur l'application :</p>
              <div style="background-color: #f1f5f9; padding: 12px 16px; border-radius: 8px; font-weight: bold; font-size: 15px; color: #0f172a; margin: 16px 0;">
                ${userEmail}
              </div>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Date : ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
              </p>
            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur notification inscription :', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
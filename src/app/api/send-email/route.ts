import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, title, slug, isPaid } = await request.json();

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'https://www.klicevent.com';

    // Routes réelles de l'application
    const guestUrl = `${baseUrl}/events/${slug}`;
    const slideshowUrl = `${baseUrl}/events/${slug}/slideshow`;
    const adminUrl = `${baseUrl}/events/${slug}/admin`;
    const dashboardUrl = `${baseUrl}/dashboard`;

    // Si tu as validé ton domaine klicevent.com dans Resend, utilise 'KlicEvent <bonjour@klicevent.com>'
    // Sinon laisse 'KlicEvent <onboarding@resend.dev>' pour tester
    const senderEmail =
      process.env.RESEND_FROM_EMAIL || 'KlicEvent <onboarding@resend.dev>';

    const data = await resend.emails.send({
      from: senderEmail,
      to: [email],
      subject: `Accès à votre événement : ${title}`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="utf-8" />
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 32px 16px;">
            <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              
              <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 800; color: #7c3aed;">KlicEvent</span>
              </div>

              <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0;">
                Votre événement est prêt !
              </h1>
              
              <p style="font-size: 15px; line-height: 1.5; color: #475569; margin: 0 0 24px 0;">
                Bonjour, votre espace photo pour <strong>${title}</strong> est configuré. Retrouvez ci-dessous l'ensemble de vos accès :
              </p>

              <!-- Carte Dashboard -->
              <div style="background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center;">
                <p style="font-size: 13px; font-weight: 600; color: #6d28d9; margin: 0 0 12px 0;">
                  ESPACE ORGANISATEUR &amp; QR CODE
                </p>
                <a href="${dashboardUrl}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                  Ouvrir mon tableau de bord
                </a>
              </div>

              <!-- Bloc des liens directs -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                
                <div style="margin-bottom: 16px;">
                  <strong style="font-size: 14px; color: #0f172a; display: block;">📸 Lien invité (prise de photo) :</strong>
                  <p style="font-size: 12px; color: #64748b; margin: 2px 0 6px 0;">À partager à vos proches ou afficher via le QR code :</p>
                  <a href="${guestUrl}" style="font-size: 13px; color: #7c3aed; word-break: break-all; text-decoration: none;">${guestUrl}</a>
                </div>

                <div style="margin-bottom: 16px;">
                  <strong style="font-size: 14px; color: #0f172a; display: block;">🖥️ Diaporama en direct (grand écran) :</strong>
                  <p style="font-size: 12px; color: #64748b; margin: 2px 0 6px 0;">À projeter pendant la soirée :</p>
                  <a href="${slideshowUrl}" style="font-size: 13px; color: #7c3aed; word-break: break-all; text-decoration: none;">${slideshowUrl}</a>
                </div>

                <div>
                  <strong style="font-size: 14px; color: #0f172a; display: block;">⚙️ Modération directe &amp; Export ZIP :</strong>
                  <a href="${adminUrl}" style="font-size: 13px; color: #7c3aed; word-break: break-all; text-decoration: none;">${adminUrl}</a>
                </div>

              </div>

              ${
                isPaid
                  ? `
                <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 24px;">
                  <p style="font-size: 13px; color: #065f46; margin: 0;">
                    ✅ <strong>Paiement validé.</strong> Votre reçu officiel vous a été envoyé séparément par Stripe.
                  </p>
                </div>
              `
                  : ''
              }

              <p style="font-size: 12px; line-height: 1.5; color: #94a3b8; margin: 0;">
                Conservez cet e-mail pour retrouver vos liens à tout moment.<br />
                Une question ? Répondez simplement à ce message.
              </p>

            </div>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
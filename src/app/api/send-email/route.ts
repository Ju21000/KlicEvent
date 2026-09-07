import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, title, slug, isPaid } = await request.json();

    const eventUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://klic-event-3qvk.vercel.app'}/events/${slug}`;
    const uploadUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://klic-event-3qvk.vercel.app'}/upload?event=${slug}`;

    const data = await resend.emails.send({
      from: 'KlicEvent <onboarding@resend.dev>',
      to: [email],
      subject: `📸 Votre événement "${title}" est créé !`,
      html: `
        <div style="font-family: sans-serif; background-color: #020617; color: #ffffff; padding: 32px; border-radius: 12px;">
          <h1 style="color: #c084fc; font-size: 24px;">KlicEvent 📸</h1>
          <p>Bonjour,</p>
          <p>Votre espace photo pour l'événement <strong>${title}</strong> est prêt à l'emploi.</p>
          
          <div style="background-color: #0f172a; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #1e293b;">
            <p style="margin: 0 0 10px 0;">🔗 <strong>Lien de gestion (Galerie & QR Code) :</strong><br><a href="${eventUrl}" style="color: #c084fc; word-break: break-all;">${eventUrl}</a></p>
            <p style="margin: 15px 0 0 0;">📤 <strong>Lien de dépôt pour vos invités :</strong><br><a href="${uploadUrl}" style="color: #38bdf8; word-break: break-all;">${uploadUrl}</a></p>
          </div>

          ${isPaid ? '<p style="font-size: 14px; color: #38bdf8;">✅ Paiement validé. Votre facture officielle vous a été envoyée séparément par notre service de paiement.</p>' : ''}

          <p style="font-size: 14px; color: #94a3b8;">Conservez bien cet e-mail pour retrouver votre événement à tout moment. Bon événement !</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
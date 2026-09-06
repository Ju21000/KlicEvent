import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, eventTitle, eventSlug } = await request.json();
    const eventUrl = `http://localhost:3000/events/${eventSlug}`;

    const data = await resend.emails.send({
      from: 'Galerie Événement <onboarding@resend.dev>',
      to: [email],
      subject: `Accès à votre galerie : ${eventTitle}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Votre galerie est prête !</h2>
          <p>Bonjour,</p>
          <p>Votre événement <strong>${eventTitle}</strong> a bien été configuré.</p>
          <p>Vous pouvez dès à présent consulter votre galerie, partager le QR code et récupérer vos souvenirs ici :</p>
          <a href="${eventUrl}" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 8px; margin-top: 10px;">Accéder à ma galerie</a>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: Request) {
  try {
    const urlObj = new URL(request.url);
    const sessionId = urlObj.searchParams.get('session_id');
    
    // On force l'URL de production Vercel pour éviter tout 'undefined'
    const origin = 'https://klic-event-3qvk.vercel.app';

    if (!sessionId) {
      return NextResponse.json({ error: 'ID de session manquant' }, { status: 400 });
    }

    if (sessionId === 'free_demo') {
      return NextResponse.json({
        success: true,
        galleryUrl: `${origin}/events/demo-event`,
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Le paiement n\'a pas été validé.' }, { status: 400 });
    }

    const eventSlug = session.id.slice(-8);
    const galleryUrl = `${origin}/events/${eventSlug}`;

    return NextResponse.json({
      success: true,
      galleryUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
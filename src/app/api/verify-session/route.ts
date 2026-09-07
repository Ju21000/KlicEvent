import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'ID de session manquant' }, { status: 400 });
    }

    // Récupération de la session de paiement auprès de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Le paiement n\'a pas été validé.' }, { status: 400 });
    }

    // Ici, tu peux insérer l'enregistrement de l'événement dans ta base de données 
    // en récupérant les informations stockées dans les metadata de la session Stripe si besoin.

    // Génération du lien unique de la galerie
    const eventSlug = session.id.slice(-8);
    const galleryUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/events/${eventSlug}`;

    return NextResponse.json({
      success: true,
      galleryUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
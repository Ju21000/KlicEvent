import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { eventId, planType, email, eventTitle } = await req.json();

    if (!eventId || !planType) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    // Définition des prix selon la formule
    let unitAmount = 2900; // Standard par défaut (29 €)
    let planName = 'Formule Standard - KlicEvent';

    if (planType === 'pro') {
      unitAmount = 4900; // 49 €
      planName = 'Formule Pro - KlicEvent';
    }

    // Récupération dynamique de l'origine (klicevent.com en production)
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'klicevent.com';
    const origin = `${protocol}://${host}`;

    // Création de la session de paiement Stripe avec support des codes promo
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      allow_promotion_codes: true, // Active le champ code promo (ex: VIP100) sur Stripe
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planName,
              description: `Événement : ${eventTitle || 'Mon Événement'}`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&eventId=${eventId}`,
      cancel_url: `${origin}/create-event?eventId=${eventId}`,
      metadata: {
        eventId: eventId,
        planType: planType,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Erreur Stripe Checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
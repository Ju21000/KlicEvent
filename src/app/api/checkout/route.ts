import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-28.acacia' as any,
});

export async function POST(request: Request) {
  try {
    const { eventId, title, price, slug } = await request.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Mise à niveau - ${title}`,
            },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/events/${slug}?success=true`,
      cancel_url: `${request.headers.get('origin')}/events/${slug}`,
      metadata: {
        eventId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Erreur Stripe :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
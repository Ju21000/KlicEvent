import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  try {
    const { title, date, email, formula } = await request.json();
    const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://klic-event-3qvk.vercel.app';

    if (formula !== 'standard') {
      return NextResponse.json({ error: 'Formule invalide' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `KlicEvent - Formule Standard (300 photos) : ${title}`,
            },
            unit_amount: 2900, // 29,00 €
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/api/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/create-event`,
      metadata: {
        title,
        date,
        email,
        formula,
        maxPhotos: '300',
        price: '29',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
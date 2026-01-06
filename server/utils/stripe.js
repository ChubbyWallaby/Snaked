import Stripe from 'stripe'

let stripe = null

export const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.trim() : null

    if (!stripe && key && !key.includes('placeholder')) {
        try {
            if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
                console.warn('⚠️ WARNING: STRIPE_WEBHOOK_SECRET is missing in production environment!')
            }

            stripe = new Stripe(key, {
                apiVersion: '2023-10-16'
            })
            console.log('Stripe initialized successfully')
        } catch (err) {
            console.error('Failed to initialize Stripe:', err)
        }
    }
    return stripe
}

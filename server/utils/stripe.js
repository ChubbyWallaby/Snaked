import Stripe from 'stripe'

let stripe = null

export const getStripe = () => {
    const key = process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.trim() : null

    if (!stripe && key && !key.includes('placeholder')) {
        try {
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

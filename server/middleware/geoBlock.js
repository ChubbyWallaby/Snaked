import axios from 'axios'

// List of blocked country codes (OFAC-sanctioned and restricted jurisdictions)
const BLOCKED_COUNTRIES = process.env.BLOCKED_COUNTRIES
    ? process.env.BLOCKED_COUNTRIES.split(',')
    : [
        'KP',  // North Korea
        'IR',  // Iran
        'CU',  // Cuba
        'SY',  // Syria
        'SD',  // Sudan
        'VE',  // Venezuela (partial sanctions)
    ]

const GEO_BLOCK_ENABLED = process.env.GEO_BLOCK_ENABLED !== 'false' // Enabled by default

/**
 * Middleware to block users from restricted countries based on IP geolocation
 */
export async function geoBlockMiddleware(req, res, next) {
    // Skip if geo-blocking is disabled
    if (!GEO_BLOCK_ENABLED) {
        return next()
    }

    try {
        // Get client IP address
        // Handle various proxy headers
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim()
            || req.headers['x-real-ip']
            || req.connection.remoteAddress
            || req.socket.remoteAddress
            || req.ip

        // Skip for localhost/development IPs
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            console.log('🌍 Geo-block: Skipping local IP:', ip)
            return next()
        }

        console.log('🌍 Geo-block: Checking IP:', ip)

        // Use free IP geolocation service (ip-api.com)
        // Note: Limited to 45 requests/minute for free tier
        const geoResponse = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode`, {
            timeout: 3000 // 3 second timeout
        })

        if (geoResponse.data.status === 'fail') {
            console.warn('⚠️ Geo-block: Failed to get location for IP:', ip, geoResponse.data.message)
            // Allow access if geolocation fails (fail-open for better UX)
            return next()
        }

        const countryCode = geoResponse.data.countryCode
        const country = geoResponse.data.country

        console.log(`🌍 Geo-block: IP ${ip} is from ${country} (${countryCode})`)

        // Check if country is blocked
        if (BLOCKED_COUNTRIES.includes(countryCode)) {
            console.warn(`🚫 Geo-block: Blocked access from ${country} (${countryCode})`)
            return res.status(403).json({
                message: `Access from ${country} is not permitted due to regulatory restrictions.`,
                countryCode,
                blocked: true
            })
        }

        // Store country info in request for audit logging
        req.geoLocation = {
            ip,
            country,
            countryCode
        }

        next()
    } catch (error) {
        console.error('❌ Geo-block error:', error.message)
        // Fail-open: Allow access if geolocation service fails
        // In production, you might want to fail-closed for stricter compliance
        next()
    }
}

/**
 * Helper function to get IP from request
 */
export function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim()
        || req.headers['x-real-ip']
        || req.connection.remoteAddress
        || req.socket.remoteAddress
        || req.ip
}

/**
 * AdService - Google Ads Integration
 * 
 * This service handles rewarded video ads for game entry.
 * Currently uses mock implementation for testing.
 * Replace with real Google AdMob/AdSense integration when ready.
 */

export class AdService {
    constructor() {
        this.adUnitId = import.meta.env.VITE_AD_UNIT_ID || 'mock-ad-unit'
        this.mockMode = !import.meta.env.VITE_AD_UNIT_ID
        this.isAdLoaded = false
    }

    /**
     * Load a rewarded video ad
     * @returns {Promise<boolean>} True if ad loaded successfully
     */
    async loadRewardedAd() {
        if (this.mockMode) {
            console.log('[AdService] Mock mode: Ad loaded instantly')
            this.isAdLoaded = true
            return Promise.resolve(true)
        }

        // TODO: Implement real Google AdMob/AdSense integration
        // Example:
        // return new Promise((resolve, reject) => {
        //     googletag.cmd.push(() => {
        //         googletag.display(this.adUnitId)
        //         resolve(true)
        //     })
        // })

        this.isAdLoaded = true
        return Promise.resolve(true)
    }

    /**
     * Show the rewarded video ad
     * @returns {Promise<{estimatedRevenue: number}>} Ad completion result with estimated revenue
     */
    async showRewardedAd() {
        if (!this.isAdLoaded) {
            await this.loadRewardedAd()
        }

        return new Promise((resolve, reject) => {
            if (this.mockMode) {
                console.log('[AdService] Mock mode: Showing ad...')

                // Simulate ad viewing delay (3 seconds)
                setTimeout(() => {
                    // Mock revenue between €0.005 - €0.015 (50-150 points)
                    const estimatedRevenue = 0.005 + Math.random() * 0.01

                    console.log(`[AdService] Mock ad completed. Revenue: €${estimatedRevenue.toFixed(4)} (${Math.round(estimatedRevenue * 10000)} points)`)

                    this.isAdLoaded = false
                    resolve({ estimatedRevenue })
                }, 3000)
            } else {
                // TODO: Implement real ad showing
                // Example:
                // rewardedAd.show()
                //     .then((reward) => {
                //         resolve({ estimatedRevenue: reward.amount })
                //     })
                //     .catch((error) => {
                //         reject(new Error('Ad failed to show'))
                //     })

                // Fallback mock for now
                setTimeout(() => {
                    const estimatedRevenue = 0.01
                    this.isAdLoaded = false
                    resolve({ estimatedRevenue })
                }, 3000)
            }
        })
    }

    /**
     * Check if ad service is ready
     * @returns {boolean} True if service is ready
     */
    isReady() {
        return true // Mock is always ready
    }
}

// Export singleton instance
export const adService = new AdService()

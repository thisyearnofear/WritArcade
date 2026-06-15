import { BuyCreditsButton } from './buy-credits'

export function BuyCreditsWrapper() {
  if (!process.env.ETHERFUSE_API_KEY) return null
  return <BuyCreditsButton />
}

import { ProfileClient } from './profile-client'

export const metadata = {
  title: 'Profile',
  description: 'Manage your wallet, preferences, and creator settings on writersarcade.',
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return <ProfileClient />
}

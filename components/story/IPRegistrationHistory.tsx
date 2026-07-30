'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, AlertCircle, ExternalLink, Copy, Shield, Clock } from 'lucide-react'
import { getIPAssetExplorerUrl, getTxExplorerUrl } from '@/domains/story/services/story-sdk-client'
import { verifyIPRegistration } from '@/domains/story/services/story-protocol.service'
import { motion } from 'framer-motion'

// ============================================================================
// Types
// ============================================================================

interface IPRegistration {
  id: string
  assetId: string
  assetTitle: string
  assetType: string
  assetGenre: string
  storyIpId: string
  transactionHash: string
  blockNumber: number
  metadataUri: string
  licenseTerms: Record<string, unknown> | null
  status: string
  registeredAt: string
  createdAt: string
}

interface VerificationStatus {
  verified: boolean
  owner?: string
  error?: string
  checking: boolean
}

// ============================================================================
// License Display Helper
// ============================================================================

function getLicenseDisplayName(licenseTerms: Record<string, unknown> | null): string {
  if (!licenseTerms) return 'Default'
  
  const flavor = licenseTerms.flavor as string
  const name = licenseTerms.name as string
  
  if (name) return name
  if (flavor === 'commercial-remix') return 'Commercial Remix'
  if (flavor === 'commercial-use') return 'Commercial Use'
  if (flavor === 'non-commercial-social-remixing') return 'Non-Commercial'
  
  return 'Custom'
}

function getLicenseBadgeColor(licenseTerms: Record<string, unknown> | null): string {
  if (!licenseTerms) return 'bg-muted text-muted-foreground'
  
  const flavor = licenseTerms.flavor as string
  
  if (flavor === 'commercial-remix') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
  if (flavor === 'commercial-use') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
  if (flavor === 'non-commercial-social-remixing') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
  
  return 'bg-muted text-muted-foreground'
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: CheckCircle2, label: 'Active' },
    registered: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle2, label: 'Registered' },
    pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: 'Pending' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  const Icon = config.icon

  return (
    <Badge className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  )
}

// ============================================================================
// Registration Card Component
// ============================================================================

function RegistrationCard({ 
  registration, 
  verification,
  onVerify 
}: { 
  registration: IPRegistration
  verification: VerificationStatus
  onVerify: () => void 
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-border rounded-lg p-4 space-y-4 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {registration.assetTitle}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              {registration.assetType}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {registration.assetGenre}
            </Badge>
            <StatusBadge status={registration.status} />
          </div>
        </div>
        <Badge className={getLicenseBadgeColor(registration.licenseTerms)}>
          {getLicenseDisplayName(registration.licenseTerms)}
        </Badge>
      </div>

      {/* IP Asset ID */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">
          IP Asset ID
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded truncate">
            {registration.storyIpId}
          </code>
          <button
            onClick={() => copyToClipboard(registration.storyIpId, 'ipId')}
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="Copy IP ID"
          >
            {copiedField === 'ipId' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <a
            href={getIPAssetExplorerUrl(registration.storyIpId)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-muted rounded transition-colors"
            title="View on Story Explorer"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Transaction
          </label>
          <a
            href={getTxExplorerUrl(registration.transactionHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline font-mono text-xs truncate"
          >
            {registration.transactionHash.slice(0, 10)}...{registration.transactionHash.slice(-8)}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Block
          </label>
          <p className="font-mono text-xs text-muted-foreground">
            #{registration.blockNumber.toLocaleString()}
          </p>
        </div>
      </div>

      {/* On-Chain Verification */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className={`h-4 w-4 ${verification.verified ? 'text-green-500' : verification.checking ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <span className="text-sm text-muted-foreground">
              On-Chain Verification
            </span>
          </div>
          {verification.checking ? (
            <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Verifying...
            </div>
          ) : verification.verified ? (
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onVerify}
              className="text-xs"
            >
              Verify Now
            </Button>
          )}
        </div>
        {verification.error && (
          <p className="text-xs text-red-500 mt-1">{verification.error}</p>
        )}
        {verification.verified && verification.owner && (
          <p className="text-xs text-muted-foreground mt-1">
            Owner: {verification.owner.slice(0, 6)}...{verification.owner.slice(-4)}
          </p>
        )}
      </div>

      {/* Registration Date */}
      <div className="text-xs text-muted-foreground">
        Registered: {new Date(registration.registeredAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </motion.div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function IPRegistrationHistory() {
  const { address, isConnected } = useAccount()
  const [registrations, setRegistrations] = useState<IPRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<Record<string, VerificationStatus>>({})

  // Load registrations
  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false)
      return
    }

    const loadRegistrations = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/ip/registrations?wallet=${encodeURIComponent(address)}`)
        if (!response.ok) throw new Error('Failed to load registrations')

        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Failed to load registrations')

        setRegistrations(data.data.registrations || [])
      } catch (err) {
        console.error('Failed to load IP registrations:', err)
        setError(err instanceof Error ? err.message : 'Failed to load registrations')
      } finally {
        setLoading(false)
      }
    }

    loadRegistrations()
  }, [address, isConnected])

  // Verify a specific registration on-chain
  const verifyRegistration = useCallback(async (registration: IPRegistration) => {
    setVerificationStatus(prev => ({
      ...prev,
      [registration.id]: { verified: false, checking: true }
    }))

    try {
      const result = await verifyIPRegistration(registration.storyIpId, registration.transactionHash)
      
      setVerificationStatus(prev => ({
        ...prev,
        [registration.id]: {
          verified: result.verified,
          owner: result.owner,
          error: result.error,
          checking: false
        }
      }))
    } catch (err) {
      setVerificationStatus(prev => ({
        ...prev,
        [registration.id]: {
          verified: false,
          error: err instanceof Error ? err.message : 'Verification failed',
          checking: false
        }
      }))
    }
  }, [])

  if (!isConnected) {
    return null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              IP Registrations
            </CardTitle>
            <CardDescription>
              Your Story Protocol IP asset registrations with on-chain verification
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {registrations.length} registration{registrations.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {registrations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">
              No IP Registrations Yet
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Register your games and assets as IP on Story Protocol to protect your creative work and enable automatic royalties from derivatives.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map(registration => (
              <RegistrationCard
                key={registration.id}
                registration={registration}
                verification={verificationStatus[registration.id] || { verified: false, checking: false }}
                onVerify={() => verifyRegistration(registration)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
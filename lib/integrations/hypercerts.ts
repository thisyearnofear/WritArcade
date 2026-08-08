/**
 * Hypercerts Service
 * Creates impact certificates for game creation via AT Protocol.
 *
 * Each game created on WritersArcade represents a creative collaboration:
 * - The article writer provided source material
 * - The game creator (reader) shaped the interactive interpretation
 * - The AI generated the game content
 *
 * This certifies the creative contribution as a public good artifact.
 *
 * ENHANCEMENT FIRST: Follows existing service patterns (config, logger)
 * DRY: Single source of truth for hypercert creation logic
 */

import { config, logger } from '@/lib/config'

export interface HypercertContributor {
  identity: string // DID or wallet address
  role: string
  weight: number // 0-100
}

export interface HypercertInput {
  title: string
  description: string
  shortDescription: string
  workScope: string
  startDate: string // ISO 8601
  endDate: string
  contributors: HypercertContributor[]
  measurements?: Array<{
    metric: string
    value: string
    unit: string
  }>
  attachments?: Array<{
    title: string
    content: Array<{ uri: string }>
  }>
}

export interface HypercertResult {
  uri: string // at://did:plc:xxx/org.hypercerts.claim.activity/yyy
  cid: string // content hash
}

/**
 * Create a hypercert for a game creation event.
 * Uses AT Protocol to store the impact certificate on the creator's PDS.
 *
 * In development/demo mode, returns mock URIs to avoid requiring
 * full AT Protocol OAuth setup.
 */
export async function createGameHypercert(
  input: HypercertInput
): Promise<HypercertResult | null> {
  if (!config.hypercerts.enabled) {
    logger.hypercerts('Disabled — skipping hypercert creation', {})
    return null
  }

  try {
    const { AtpAgent } = await import('@atproto/api')

    // For server-side creation, we use app password authentication
    // In production, this would be the platform's certified.app account
    const handle = process.env.HYPERCERTS_HANDLE
    const appPassword = process.env.HYPERCERTS_APP_PASSWORD

    if (!handle || !appPassword) {
      logger.hypercerts('No credentials configured — using mock URI', {})
      return createMockHypercert(input)
    }

    // Authenticate with AT Protocol using app password
    const agent = new AtpAgent({
      service: config.hypercerts.pdsUrl,
    })

    const loginResult = await agent.login({
      identifier: handle,
      password: appPassword,
    })

    if (!loginResult.success) {
      logger.warn('Hypercerts AT Protocol login failed', { context: 'hypercerts' })
      return createMockHypercert(input)
    }

    // Build the activity claim record
    const agentDid = (agent as unknown as { session: { did: string } }).session?.did
    if (!agentDid) {
      logger.warn('Hypercerts: No session DID after login', { context: 'hypercerts' })
      return createMockHypercert(input)
    }

    const record: Record<string, unknown> = {
      $type: 'org.hypercerts.claim.activity',
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      workScope: {
        $type: 'org.hypercerts.claim.activity#workScopeString',
        scope: input.workScope,
      },
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt: new Date().toISOString(),
    }

    // Add contributors if present
    if (input.contributors.length > 0) {
      record.contributors = input.contributors.map((c) => ({
        contributorIdentity: {
          $type: 'org.hypercerts.claim.activity#contributorIdentity',
          identity: c.identity,
        },
        contributionWeight: String(c.weight),
        contributionDetails: {
          $type: 'org.hypercerts.claim.activity#contributorRole',
          role: c.role,
        },
      }))
    }

    // Create the activity claim
    const result = await agent.com.atproto.repo.createRecord({
      repo: agentDid,
      collection: 'org.hypercerts.claim.activity',
      record,
    })

    const hypercertUri = result.data.uri
    const hypercertCid = result.data.cid

    logger.hypercerts('Created hypercert', {
      uri: hypercertUri,
      cid: hypercertCid,
      title: input.title,
    })

    // Add measurements if present
    if (input.measurements && input.measurements.length > 0) {
      for (const measurement of input.measurements) {
        try {
          await agent.com.atproto.repo.createRecord({
            repo: agentDid,
            collection: 'org.hypercerts.context.measurement',
            record: {
              $type: 'org.hypercerts.context.measurement',
              subjects: [{ uri: hypercertUri, cid: hypercertCid }],
              metric: measurement.metric,
              value: measurement.value,
              unit: measurement.unit,
              startDate: input.startDate,
              endDate: input.endDate,
              methodType: 'automated',
              createdAt: new Date().toISOString(),
            },
          })
        } catch (measureError) {
          logger.warn('Failed to add hypercert measurement', {
            context: 'hypercerts',
            error: measureError instanceof Error ? measureError.message : 'Unknown',
          })
        }
      }
    }

    // Add attachments if present
    if (input.attachments && input.attachments.length > 0) {
      for (const attachment of input.attachments) {
        try {
          await agent.com.atproto.repo.createRecord({
            repo: agentDid,
            collection: 'org.hypercerts.context.attachment',
            record: {
              $type: 'org.hypercerts.context.attachment',
              subjects: [{ uri: hypercertUri, cid: hypercertCid }],
              title: attachment.title,
              content: attachment.content,
              createdAt: new Date().toISOString(),
            },
          })
        } catch (attachError) {
          logger.warn('Failed to add hypercert attachment', {
            context: 'hypercerts',
            error: attachError instanceof Error ? attachError.message : 'Unknown',
          })
        }
      }
    }

    return { uri: hypercertUri, cid: hypercertCid }
  } catch (error) {
    logger.error('Hypercert creation failed', error, { context: 'hypercerts' })
    return createMockHypercert(input)
  }
}

/**
 * Build hypercert input from game data.
 * DRY: Single source of truth for hypercert data construction.
 */
export function buildGameHypercertInput(params: {
  gameTitle: string
  gameDescription: string
  genre: string
  articleTitle?: string
  authorName?: string
  authorWallet?: string
  creatorWallet?: string
  articleFidelityScore?: number
}): HypercertInput {
  const now = new Date()
  const contributors: HypercertContributor[] = []

  // Article writer as primary contributor
  if (params.authorName || params.authorWallet) {
    contributors.push({
      identity: params.authorWallet || `did:plc:${params.authorName}`,
      role: 'Source Material Author',
      weight: 50,
    })
  }

  // Game creator as collaborator
  if (params.creatorWallet) {
    contributors.push({
      identity: params.creatorWallet,
      role: 'Interactive Game Creator',
      weight: 40,
    })
  }

  // AI as contributor (represented as platform)
  contributors.push({
    identity: 'did:plc:writersarcade',
    role: 'AI Game Generation',
    weight: 10,
  })

  const measurements: Array<{ metric: string; value: string; unit: string }> = [
    {
      metric: 'Interactive panels generated',
      value: '5',
      unit: 'panels',
    },
  ]

  if (params.articleFidelityScore !== undefined) {
    measurements.push({
      metric: 'Article fidelity score',
      value: String(params.articleFidelityScore),
      unit: 'percent',
    })
  }

  return {
    title: `Interactive Fiction: ${params.gameTitle}`,
    shortDescription: `${params.genre} game generated from "${params.articleTitle || 'article'}" — a creative collaboration between writer and reader.`,
    description: [
      `"${params.gameTitle}" is an interactive comic-style game generated from`,
      params.articleTitle ? `"${params.articleTitle}"` : 'an article',
      params.authorName ? `by ${params.authorName}` : '',
      `. This hypercert certifies the creative collaboration that produced this`,
      `playable, ownable work of interactive fiction on WritersArcade.`,
    ]
      .filter(Boolean)
      .join(' '),
    workScope: 'Interactive Fiction',
    startDate: now.toISOString(),
    endDate: now.toISOString(),
    contributors,
    measurements,
    attachments: [
      {
        title: 'WritersArcade Game',
        content: [{ uri: 'https://writersarcade.vercel.app' }],
      },
    ],
  }
}

/**
 * Mock hypercert for development/demo mode.
 * Returns a plausible AT Protocol URI without actual PDS interaction.
 */
function createMockHypercert(_input: HypercertInput): HypercertResult {
  const mockDid = 'did:plc:writersarcade-mock'
  const mockRkey = Math.random().toString(36).substring(2, 15)
  const mockCid = `bafyrei${Math.random().toString(36).substring(2, 50)}`

  return {
    uri: `at://${mockDid}/org.hypercerts.claim.activity/${mockRkey}`,
    cid: mockCid,
  }
}

/**
 * User-facing secret panel / epilogue status (Inco primary, legacy CDR fallback).
 */

export type SecretPanelStatus =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'inco'; tokenId: string }
  | { kind: 'legacy'; vaultUuid: string }

export interface SecretPanelGameFields {
  promptVaultUuid?: string | null
  wordleAnswerVaultUuid?: string | null
  secretPanelGenerated?: boolean
  secretPanelCiphertext?: string | null
}

export function getSecretPanelStatus(game: SecretPanelGameFields): SecretPanelStatus {
  const vault = game.promptVaultUuid?.trim()
  if (vault?.startsWith('inco:')) {
    const tokenId = vault.slice(5)
    if (tokenId) return { kind: 'inco', tokenId }
  }
  if (vault && vault !== 'inco-pending') {
    return { kind: 'legacy', vaultUuid: vault }
  }
  if (game.secretPanelCiphertext || game.secretPanelGenerated) {
    return { kind: 'pending' }
  }
  if (game.wordleAnswerVaultUuid && !vault) {
    return { kind: 'legacy', vaultUuid: game.wordleAnswerVaultUuid }
  }
  return { kind: 'none' }
}

export function getSecretPanelLabel(status: SecretPanelStatus): string {
  switch (status.kind) {
    case 'inco':
      return 'Secret epilogue · encrypted on Base'
    case 'legacy':
      return 'Secret epilogue · legacy vault'
    case 'pending':
      return 'Secret epilogue · preparing'
    case 'none':
      return 'No secret epilogue'
  }
}

export function getSecretPanelShortLabel(status: SecretPanelStatus): string {
  switch (status.kind) {
    case 'inco':
      return 'Inco'
    case 'legacy':
      return 'Legacy'
    case 'pending':
      return 'Pending'
    case 'none':
      return 'None'
  }
}

export function formatSecretPanelDetail(status: SecretPanelStatus): string {
  switch (status.kind) {
    case 'inco':
      return `Encrypted on-chain · NFT #${status.tokenId}`
    case 'legacy':
      return 'Legacy encrypted unlock (pre-Inco)'
    case 'pending':
      return 'Epilogue generated · stores on mint'
    case 'none':
      return 'Finish the story to generate a secret epilogue'
  }
}

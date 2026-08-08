import { describe, expect, it } from 'vitest'
import {
  buildParagraphPostUrl,
  orderPublicationsForDay,
  pickUnusedPostUrl,
} from '@/lib/basepaint/featured-auto'

describe('buildParagraphPostUrl', () => {
  it('builds a canonical paragraph.com URL', () => {
    expect(buildParagraphPostUrl('debbie', 'hello-world')).toBe(
      'https://paragraph.com/@debbie/hello-world'
    )
  })

  it('strips a leading @ from the publication slug', () => {
    expect(buildParagraphPostUrl('@jake', 'post')).toBe(
      'https://paragraph.com/@jake/post'
    )
  })
})

describe('orderPublicationsForDay', () => {
  it('rotates the allowlist by day index', () => {
    const slugs = ['a', 'b', 'c']
    expect(orderPublicationsForDay(slugs, 1)).toEqual(['a', 'b', 'c'])
    expect(orderPublicationsForDay(slugs, 2)).toEqual(['b', 'c', 'a'])
    expect(orderPublicationsForDay(slugs, 3)).toEqual(['c', 'a', 'b'])
    expect(orderPublicationsForDay(slugs, 4)).toEqual(['a', 'b', 'c'])
  })

  it('returns empty for empty allowlist', () => {
    expect(orderPublicationsForDay([], 10)).toEqual([])
  })
})

describe('pickUnusedPostUrl', () => {
  it('skips posts already featured recently', () => {
    const recent = new Set(['https://paragraph.com/@debbie/old'.toLowerCase()])
    const pick = pickUnusedPostUrl(
      [
        { slug: 'old', title: 'Old' },
        { slug: 'fresh', title: 'Fresh' },
      ],
      'debbie',
      recent
    )
    expect(pick).toEqual({
      url: 'https://paragraph.com/@debbie/fresh',
      title: 'Fresh',
    })
  })

  it('returns null when every candidate was used', () => {
    const recent = new Set(['https://paragraph.com/@debbie/only'.toLowerCase()])
    expect(
      pickUnusedPostUrl([{ slug: 'only', title: 'Only' }], 'debbie', recent)
    ).toBeNull()
  })
})

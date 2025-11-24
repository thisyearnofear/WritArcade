'use client'

import { useState } from 'react'
import { type WriterCoin } from '@/lib/writerCoins'
import { validateArticleForWriterCoin, fetchParagraphArticle } from '@/lib/paragraph'

interface ArticleInputProps {
    writerCoin: WriterCoin
    onSubmit: (url: string) => void
    onBack: () => void
}

export function ArticleInput({ writerCoin, onSubmit, onBack }: ArticleInputProps) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ title: string; excerpt: string } | null>(null)

    const handleValidate = async () => {
        setError(null)
        setPreview(null)
        setLoading(true)

        try {
            // Validate URL format and author
            const validation = await validateArticleForWriterCoin(url, writerCoin.id)
            if (!validation.valid) {
                setError(validation.error || 'Invalid article URL')
                setLoading(false)
                return
            }

            // Fetch article preview
            const article = await fetchParagraphArticle(url)
            if (!article) {
                setError('Could not fetch article. Please check the URL.')
                setLoading(false)
                return
            }

            setPreview({
                title: article.title,
                excerpt: article.content.slice(0, 200) + '...',
            })
        } catch (err) {
            setError('Failed to validate article')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = () => {
        if (preview) {
            onSubmit(url)
        }
    }

    return (
        <div>
            <button
                onClick={onBack}
                className="mb-4 flex items-center space-x-2 text-purple-300 hover:text-purple-200"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
            </button>

            <h2 className="mb-2 text-2xl font-bold text-white">Paste Article URL</h2>
            <p className="mb-6 text-purple-200">
                Enter a {writerCoin.writer} article from {writerCoin.paragraphUrl}
            </p>

            <div className="space-y-4">
                {/* URL Input */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-purple-200">
                        Article URL
                    </label>
                    <div className="flex space-x-2">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value)
                                setError(null)
                                setPreview(null)
                            }}
                            placeholder={`${writerCoin.paragraphUrl}article-slug`}
                            className="flex-1 rounded-lg border border-purple-500/30 bg-white/10 px-4 py-3 text-white placeholder-purple-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                        />
                        <button
                            onClick={handleValidate}
                            disabled={!url || loading}
                            className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Checking...' : 'Validate'}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="rounded-lg bg-red-500/20 border border-red-500/30 p-4">
                        <p className="text-sm text-red-200">❌ {error}</p>
                    </div>
                )}

                {/* Article Preview */}
                {preview && (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                        <div className="mb-2 flex items-center space-x-2">
                            <span className="text-green-400">✓</span>
                            <span className="font-semibold text-green-200">Article Found</span>
                        </div>
                        <h3 className="mb-2 text-lg font-bold text-white">{preview.title}</h3>
                        <p className="text-sm text-purple-200">{preview.excerpt}</p>

                        <button
                            onClick={handleSubmit}
                            className="mt-4 w-full rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-500"
                        >
                            Continue to Customization →
                        </button>
                    </div>
                )}

                {/* Help Text */}
                <div className="rounded-lg bg-purple-900/30 p-4">
                    <p className="text-xs text-purple-300">
                        💡 <span className="font-semibold">Tip:</span> Make sure you're using an article from {writerCoin.writer}'s Paragraph newsletter. The URL should start with {writerCoin.paragraphUrl}
                    </p>
                </div>
            </div>
        </div>
    )
}

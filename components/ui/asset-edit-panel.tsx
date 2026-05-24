'use client'

import { useState } from 'react'
import { Pencil, Check, X, Plus, Tag } from 'lucide-react'

interface AssetTag {
  key: string // e.g., "tone", "audience", "difficulty"
  value: string // e.g., "dark", "adult", "hard"
}

interface AssetEditPanelProps {
  title: string
  description?: string
  tags?: AssetTag[]
  editable?: boolean
  onTitleChange?: (newTitle: string) => void
  onDescriptionChange?: (newDescription: string) => void
  onTagsChange?: (newTags: AssetTag[]) => void
  // Enhanced with character customization
  characterData?: {
    name?: string
    role?: string
    personality?: string
    appearance?: string
    customizationOptions?: Array<{
      category: string
      options: string[]
      current?: string
    }>
  }
  onCharacterUpdate?: (updates: Partial<{
    name: string
    role: string
    personality: string
    appearance: string
    customization: Record<string, string>
  }>) => void
}

export function AssetEditPanel({
  title,
  description,
  tags = [],
  editable = true,
  onTitleChange,
  onDescriptionChange,
  onTagsChange,
  characterData,
  onCharacterUpdate,
}: AssetEditPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editedDescription, setEditedDescription] = useState(description || '')
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [newTagKey, setNewTagKey] = useState('')
  const [newTagValue, setNewTagValue] = useState('')

  const handleSaveTitle = () => {
    if (onTitleChange && editedTitle.trim()) {
      onTitleChange(editedTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleCancelEdit = () => {
    setEditedTitle(title)
    setIsEditingTitle(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleSaveDescription = () => {
    if (onDescriptionChange && editedDescription.trim()) {
      onDescriptionChange(editedDescription.trim())
    }
    setIsEditingDescription(false)
  }

  const handleCancelDescriptionEdit = () => {
    setEditedDescription(description || '')
    setIsEditingDescription(false)
  }

  const handleAddTag = () => {
    if (newTagKey.trim() && newTagValue.trim() && onTagsChange) {
      const updatedTags = [
        ...tags,
        { key: newTagKey.toLowerCase(), value: newTagValue.toLowerCase() }
      ]
      onTagsChange(updatedTags)
      setNewTagKey('')
      setNewTagValue('')
    }
  }

  const handleRemoveTag = (index: number) => {
    if (onTagsChange) {
      onTagsChange(tags.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="space-y-4">
      {/* Title Edit */}
      {isEditingTitle ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-card border border-purple-500 rounded px-3 py-2 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            autoFocus
          />
          <button
            onClick={handleSaveTitle}
            className="p-2 hover:bg-green-600/20 rounded text-green-400"
            title="Save title"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={handleCancelEdit}
            className="p-2 hover:bg-red-600/20 rounded text-red-400"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 group">
          <h4 className="font-bold text-white text-lg">{title}</h4>
          {editable && onTitleChange && (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity"
              title="Edit title"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Description Edit */}
      {description !== undefined && onDescriptionChange && (
        <div className="group">
          {isEditingDescription ? (
            <div className="space-y-2">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelDescriptionEdit()
                }}
                className="w-full bg-card border border-purple-500 rounded px-3 py-2 text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 min-h-[80px] resize-y"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelDescriptionEdit}
                  className="px-3 py-1 text-xs hover:bg-red-600/20 rounded text-red-400 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={handleSaveDescription}
                  className="px-3 py-1 text-xs hover:bg-green-600/20 rounded text-green-400 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="text-sm text-muted-foreground flex-1">{description}</p>
              {editable && (
                <button
                  onClick={() => setIsEditingDescription(true)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-purple-600/20 rounded text-purple-400 transition-opacity flex-shrink-0"
                  title="Edit description"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tags Edit */}
      {editable && onTagsChange && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs uppercase font-bold text-muted-foreground">Tags</span>
          </div>

          {/* Display tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <div
                  key={i}
                  className="bg-purple-900/30 border border-purple-700/50 px-2 py-1 rounded text-xs text-purple-200 flex items-center gap-2 group/tag"
                >
                  <span>
                    <span className="font-semibold">{tag.key}:</span>
                    <span className="ml-1">{tag.value}</span>
                  </span>
                  {editable && (
                    <button
                      onClick={() => handleRemoveTag(i)}
                      className="opacity-0 group-hover/tag:opacity-100 text-purple-400 hover:text-red-400 transition-opacity"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add tag form */}
          {isEditingTags ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Key</label>
                <input
                  type="text"
                  value={newTagKey}
                  onChange={(e) => setNewTagKey(e.target.value)}
                  placeholder="e.g., tone"
                  className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                  autoFocus
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Value</label>
                <input
                  type="text"
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  placeholder="e.g., dark"
                  className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>
              <button
                onClick={handleAddTag}
                className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 rounded text-green-400 text-xs transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsEditingTags(false)
                  setNewTagKey('')
                  setNewTagValue('')
                }}
                className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400 text-xs transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTags(true)}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Tag
            </button>
          )}
        </div>
      )}

      {/* Character Customization - Enhanced Feature */}
      {characterData && (
        <div className="mt-4 p-3 bg-muted/50 border border-border rounded-lg">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
            <Pencil className="w-4 h-4 text-purple-400" />
            Character Customization
          </h4>

          {/* Character Attributes */}
          <div className="space-y-3 text-sm">
            {characterData.name && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Name:</span>
                <span className="text-foreground font-medium">{characterData.name}</span>
              </div>
            )}
            {characterData.role && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Role:</span>
                <span className="text-foreground font-medium">{characterData.role}</span>
              </div>
            )}
            {characterData.personality && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Personality:</span>
                <span className="text-foreground">{characterData.personality}</span>
              </div>
            )}
            {characterData.appearance && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground w-16">Appearance:</span>
                <span className="text-foreground">{characterData.appearance}</span>
              </div>
            )}
          </div>

          {/* Visual Customization Options */}
          {characterData.customizationOptions && characterData.customizationOptions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                Visual Customization
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {characterData.customizationOptions.map((option: { category: string, options: string[], current?: string }) => (
                  <div key={option.category} className="space-y-1">
                    <div className="text-muted-foreground capitalize">{option.category}</div>
                    <select
                      value={option.current || option.options[0]}
                      onChange={(e) => {
                        if (onCharacterUpdate) {
                          onCharacterUpdate({
                            customization: {
                              [option.category]: e.target.value
                            }
                          })
                        }
                      }}
                      className="w-full bg-muted border border-border rounded px-2 py-1 text-foreground"
                    >
                      {option.options.map((opt: string) => (
                        <option key={opt} value={opt} className="bg-card text-foreground">
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

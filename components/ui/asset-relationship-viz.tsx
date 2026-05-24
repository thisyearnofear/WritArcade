'use client'

import { AssetRelationship } from '@/domains/games/types'
import { AssetRelationshipService } from '@/domains/assets/services/asset-relationship.service'

interface AssetRelationshipVizProps {
  relationships: AssetRelationship[]
}

/**
 * SVG-based relationship visualization
 * Draws connector lines showing asset dependencies
 */
export function AssetRelationshipViz({
  relationships
}: AssetRelationshipVizProps) {
  if (relationships.length === 0) {
    return null
  }

  // Calculate SVG dimensions
  const sectionHeight = 200
  const width = 800
  const height = sectionHeight * 3 + 100
  const padding = 50

  // Color map for relationship types
  const relationshipColors: Record<string, string> = {
    activates: '#a78bfa', // purple
    uses: '#60a5fa', // blue
    triggers: '#f87171', // red
    requires: '#fbbf24' // amber
  }

  return (
    <div className="rounded-xl bg-muted/20 p-4 border border-border/30 overflow-auto">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
      >
        {/* Background sections for each asset type */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} fill="url(#grid)" opacity="0.1" />

        {/* Section labels */}
        <text x={padding - 10} y={padding + sectionHeight / 2} fontSize="12" fill="currentColor" textAnchor="end" className="text-muted-foreground">
          Characters
        </text>
        <text x={padding - 10} y={padding + sectionHeight * 1.5 + 50} fontSize="12" fill="currentColor" textAnchor="end" className="text-muted-foreground">
          Mechanics
        </text>
        <text x={padding - 10} y={padding + sectionHeight * 2.5 + 100} fontSize="12" fill="currentColor" textAnchor="end" className="text-muted-foreground">
          Stories
        </text>

        {/* Draw relationship lines */}
        {relationships.map((rel, idx) => {
          // Calculate start position (source)
          const sourceY =
            rel.source.type === 'character'
              ? padding + sectionHeight / 2
              : rel.source.type === 'mechanic'
                ? padding + sectionHeight * 1.5 + 50
                : padding + sectionHeight * 2.5 + 100

          // Calculate end position (target)
          const targetY =
            rel.target.type === 'character'
              ? padding + sectionHeight / 2
              : rel.target.type === 'mechanic'
                ? padding + sectionHeight * 1.5 + 50
                : padding + sectionHeight * 2.5 + 100

          // Spread points horizontally to avoid overlap
          const sourceX = padding + 100 + (rel.source.index % 3) * 100
          const targetX = padding + 100 + (rel.target.index % 3) * 100

          // Create curved path
          const controlY = (sourceY + targetY) / 2

          const color = relationshipColors[rel.relationshipType] || '#9ca3af'

          return (
            <g key={idx}>
              {/* Connection line with curve */}
              <path
                d={`M ${sourceX} ${sourceY} Q ${(sourceX + targetX) / 2} ${controlY} ${targetX} ${targetY}`}
                stroke={color}
                strokeWidth="2"
                fill="none"
                opacity="0.6"
                className="hover:opacity-100 transition-opacity"
              />

              {/* Arrow marker */}
              <defs>
                <marker
                  id={`arrowhead-${idx}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={color} />
                </marker>
              </defs>

              {/* Label */}
              <text
                x={(sourceX + targetX) / 2}
                y={(sourceY + targetY) / 2 - 5}
                fontSize="10"
                fill={color}
                textAnchor="middle"
                opacity="0.8"
                className="pointer-events-none"
              >
                {AssetRelationshipService.getRelationshipLabel(rel.relationshipType)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {Object.entries(relationshipColors).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{AssetRelationshipService.getRelationshipLabel(type)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

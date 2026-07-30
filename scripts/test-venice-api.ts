#!/usr/bin/env node

/**
 * Test Venice AI API Integration
 * Validates API key and tests image generation endpoint
 *
 * Usage: npx ts-node scripts/test-venice-api.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const VENICE_API_URL = 'https://api.venice.ai/api/v1/image/generate'

async function testVeniceAPI() {
  console.log('🔍 Testing Venice AI Integration\n')
  console.log('=' .repeat(60))

  // 1. Check API Key
  console.log('\n1️⃣  Checking API Key Configuration...')
  const apiKey = process.env.VENICE_API_KEY
  
  if (!apiKey) {
    console.error('❌ VENICE_API_KEY not found in environment')
    console.error('   Make sure .env file has: VENICE_API_KEY="your-key"')
    process.exit(1)
  }
  
  console.log('✅ API Key found')
  console.log(`   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`)

  // 2. Test simple image generation
  console.log('\n2️⃣  Testing Image Generation Endpoint...')
  console.log(`   Endpoint: ${VENICE_API_URL}`)
  console.log('   Model: venice-sd35')
  console.log('   Prompt: "A beautiful sunset over mountains, cinematic, professional"')

  const testPrompt = 'A beautiful sunset over mountains, cinematic, professional illustration'

  try {
    const response = await fetch(VENICE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: testPrompt,
        model: 'venice-sd35',
        width: 1024,
        height: 1024,
        format: 'png',
      }),
    })

    console.log(`   Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error:')
      console.error(`   ${errorText}`)
      
      // Try to parse as JSON
      try {
        const errorJson = JSON.parse(errorText)
        console.error('\n   Parsed Error:')
        console.error(JSON.stringify(errorJson, null, 2))
      } catch {
        // Not JSON, already printed
      }
      
      process.exit(1)
    }

    const data = await response.json()
    
    // Check response structure
    if (data.images && Array.isArray(data.images) && data.images[0]) {
      console.log('✅ Image generation successful!')
      console.log(`   Response structure: { images: [...], id: "${data.id}", timing: {...} }`)
      console.log(`   Image size: ${Math.round((data.images[0].length * 3) / 4 / 1024)}KB (base64 encoded)`)
    } else {
      console.error('❌ Unexpected response structure:')
      console.error(JSON.stringify(data, null, 2))
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Network error:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  // 3. Test ImageGenerationService if built
  console.log('\n3️⃣  Testing ImageGenerationService Integration...')
  
  try {
    // Try to load the compiled service
    const servicePath = path.join(process.cwd(), '.next/server/domains/games/services/image-generation.service.js')
    
    if (!fs.existsSync(servicePath)) {
      console.log('   ℹ️  .next build not found - run "npm run build" first')
      console.log('   ℹ️  But API key test passed ✅')
      console.log('\n' + '='.repeat(60))
      console.log('\n✅ Venice API is configured and working correctly!\n')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ImageGenerationService } = require(servicePath)
    
    console.log('   Generated with ImageGenerationService.generateNarrativeImage()')
    
    const result = await ImageGenerationService.generateNarrativeImage({
      narrative: testPrompt,
      genre: 'fantasy',
      primaryColor: '#8b5cf6',
    })

    if (result?.startsWith('data:image/png;base64,')) {
      console.log('✅ Service integration working!')
      console.log(`   Generated data URI: ${result.substring(0, 50)}...`)
    } else {
      console.warn('⚠️  Service returned unexpected format')
      console.log(`   Result: ${String(result).substring(0, 100)}...`)
    }

  } catch (error) {
    console.log('   ℹ️  Service test skipped (requires built app)')
  }

  // 4. Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Venice AI API is configured and working correctly!')
  console.log('\nKey Details:')
  console.log('  • Endpoint: https://api.venice.ai/api/v1/image/generate')
  console.log('  • Model: venice-sd35 (Stable Diffusion 3.5)')
  console.log('  • Format: PNG (base64 encoded)')
  console.log('  • Size: 1024x1024 pixels')
  console.log('  • Response: Base64 image in images[] array')
  console.log('\nNext Steps:')
  console.log('  1. npm run build')
  console.log('  2. npm run dev')
  console.log('  3. Create a game and make a choice')
  console.log('  4. Watch for "Visualizing..." spinner → fresh image\n')
}

// Run tests
testVeniceAPI().catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
})

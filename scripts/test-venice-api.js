#!/usr/bin/env node

/**
 * Test Venice AI API Integration
 * Validates API key and tests image generation endpoint
 *
 * Usage: node scripts/test-venice-api.js
 */

const fs = require('fs')
const path = require('path')

// Load .env file
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^["']|["']$/g, '')
      if (key && !process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const VENICE_API_URL = 'https://api.venice.ai/api/v1/image/generate'

async function testVeniceAPI() {
  console.log('🔍 Testing Venice AI Integration\n')
  console.log('='.repeat(60))

  // 1. Check API Key
  console.log('\n1️⃣  Checking API Key Configuration...')
  const apiKey = process.env.VENICE_API_KEY

  if (!apiKey) {
    console.error('❌ VENICE_API_KEY not found in environment')
    console.error('   Make sure .env file has: VENICE_API_KEY="your-key"')
    process.exit(1)
  }

  console.log('✅ API Key found')
  console.log(`   Key length: ${apiKey.length} characters`)
  console.log(
    `   Key preview: ${apiKey.substring(0, 10)}...${apiKey.substring(
      apiKey.length - 5
    )}`
  )
  
  // Debug: Check if key looks valid
  if (apiKey.includes('[REDACTED') || apiKey === '') {
    console.error('\n⚠️  WARNING: API Key appears to be redacted or empty!')
    console.error('   This might be a display issue. Trying anyway...\n')
  }

  // 2. Test simple image generation
  console.log('\n2️⃣  Testing Image Generation Endpoint...')
  console.log(`   Endpoint: ${VENICE_API_URL}`)
  console.log('   Model: venice-sd35')
  console.log(
    '   Prompt: "A beautiful sunset over mountains, cinematic, professional"'
  )

  const testPrompt =
    'A beautiful sunset over mountains, cinematic, professional illustration'

  try {
    const response = await fetch(VENICE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
      console.log(
        `   Response structure: { images: [...], id: "${data.id}", timing: {...} }`
      )
      console.log(
        `   Image size: ${Math.round((data.images[0].length * 3) / 4 / 1024)}KB (base64 encoded)`
      )
      console.log(
        `   First 100 chars: ${data.images[0].substring(0, 100)}...`
      )
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

  // 3. Summary
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

/**
 * Quick test script to verify Modal integration
 * Run with: node test-modal-integration.js
 * 
 * Requires MODAL_IMAGE_GEN_URL in .env.local
 */

// Load environment variables
require('dotenv').config({ path: '../../.env.local' })

const MODAL_URL = process.env.MODAL_IMAGE_GEN_URL

if (!MODAL_URL) {
  console.error('❌ MODAL_IMAGE_GEN_URL not found in .env.local')
  console.error('Please add your Modal endpoint URL to .env.local')
  process.exit(1)
}

async function testModalEndpoint() {
  console.log('Testing Modal endpoint...')
  console.log('URL:', MODAL_URL.substring(0, 50) + '...')  // Only show partial URL for security
  
  try {
    const response = await fetch(MODAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: "A simple test image of a red circle",
        width: 512,
        height: 512,
      }),
    })

    if (!response.ok) {
      console.error('❌ Request failed:', response.status, response.statusText)
      const text = await response.text()
      console.error('Response:', text)
      return false
    }

    const data = await response.json()
    
    if (data.success && data.image) {
      console.log('✅ Modal endpoint working!')
      console.log('Model:', data.model)
      console.log('Provider:', data.provider)
      console.log('Image size:', data.image.length, 'characters')
      console.log('Image preview:', data.image.substring(0, 100) + '...')
      return true
    } else {
      console.error('❌ Unexpected response format:', data)
      return false
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    return false
  }
}

testModalEndpoint()
  .then(success => {
    process.exit(success ? 0 : 1)
  })

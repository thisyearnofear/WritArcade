/**
 * Test script for Netmind AI image generation
 * Run with: npx tsx scripts/test-netmind.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const NETMIND_API_KEY = process.env.NETMIND_API_KEY || '337d266c4f024720b9501634ecbbb3da'

async function testNetmindAPI() {
  console.log('Testing Netmind AI image generation...')
  console.log('API Key:', NETMIND_API_KEY.substring(0, 8) + '...')

  // Try different model name formats
  const modelsToTry = [
    'stable-diffusion-v1-5',
    'FLUX.1-schnell',
    'stable-diffusion-3.5-large',
    'sd-v1-5',
    'flux-schnell',
  ]

  for (const model of modelsToTry) {
    console.log(`\nTrying model: ${model}`)
    
    try {
      const response = await fetch('https://api.netmind.ai/inference-api/openai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NETMIND_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          prompt: 'A simple red circle',
          response_format: 'b64_json',
        }),
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error:', errorText.substring(0, 200))
        continue
      }

      const data = await response.json()
      console.log('✅ SUCCESS with model:', model)
      console.log('Response structure:', {
        hasData: !!data.data,
        dataLength: data.data?.length,
        hasB64Json: !!data.data?.[0]?.b64_json,
      })

      // Save the image
      if (data.data?.[0]?.b64_json) {
        const imageBuffer = Buffer.from(data.data[0].b64_json, 'base64')
        const outputPath = path.join(process.cwd(), `test-netmind-${model}.png`)
        fs.writeFileSync(outputPath, imageBuffer)
        console.log('Image saved to:', outputPath)
      }
      
      break // Success, stop trying
    } catch (error) {
      console.error('Request failed:', error)
    }
  }
}

testNetmindAPI()

/**
 * Test Pollinations.ai free image generation API
 * No API key required!
 */

const PROMPT = 'A mysterious forest at twilight with glowing mushrooms';

async function testPollinations() {
  console.log('Testing Pollinations.ai API');
  console.log('Prompt:', PROMPT);
  console.log('='.repeat(60));
  
  try {
    // Pollinations.ai provides a simple URL-based API
    const encodedPrompt = encodeURIComponent(PROMPT);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;
    
    console.log('\nGenerated URL:', imageUrl);
    console.log('\nFetching image...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(imageUrl, {
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      console.log('❌ Failed to fetch image');
      return;
    }
    
    const blob = await response.blob();
    console.log('\n✅ SUCCESS!');
    console.log('Image size:', blob.size, 'bytes');
    console.log('Image type:', blob.type);
    
    // Verify it's actually an image
    if (blob.size > 0 && blob.type.startsWith('image/')) {
      console.log('\n✅ Valid image received!');
      console.log('This provider is working and requires NO API KEY!');
    } else {
      console.log('❌ Response is not a valid image');
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Timeout after 30s');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testPollinations();

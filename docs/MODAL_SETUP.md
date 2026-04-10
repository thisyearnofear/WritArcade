# Modal Image Generation Setup

Modal provides reliable, pay-per-use GPU inference. This is now integrated as a fallback provider when Venice runs out of credits.

## Setup Steps

### 1. Install Modal CLI

```bash
pip install modal
```

### 2. Authenticate with your token

```bash
modal token set --token-id ak-UjssiQV2dj7euUXdLR01zE --token-secret as-sBX4gRDlsMgbEUAhKBcVAw
```

### 3. Deploy the image generation service

```bash
cd scripts/modal
modal deploy modal_image_gen.py
```

This will:
- Build a container with Stable Diffusion 1.5
- Download model weights (~4GB) during build
- Deploy to Modal's infrastructure
- Give you a web endpoint URL

### 4. Your endpoint is deployed

After deployment, Modal will print a URL like:
```
https://your-workspace--writersarcade-image-gen-stablediffusi-xxxxx.modal.run
```

**Important:** Keep this URL private! Anyone with this URL can use your GPU credits.

Add it to your `.env.local`:
```bash
MODAL_IMAGE_GEN_URL="your-actual-endpoint-url"
```

## Integration

The Modal endpoint is now integrated into the image generation fallback chain:

1. **Primary**: Venice AI (venice-sd35)
2. **Fallback 1**: Modal (stable-diffusion-v1-5) - Self-hosted, no API costs
3. **Fallback 2**: Netmind AI (stable-diffusion-3.5-large)

The system automatically tries Modal if Venice fails, providing a reliable self-hosted fallback.

## Testing

Test the deployed endpoint:

```bash
# From project root
node scripts/modal/test-modal-integration.js

# Or test with curl (use your actual URL)
curl -X POST "$MODAL_IMAGE_GEN_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A comic book panel showing a futuristic city",
    "width": 512,
    "height": 512
  }'
```

Or test locally before deploying:

```bash
cd scripts/modal
modal run modal_image_gen.py --prompt "A comic book panel showing a futuristic city"
```

This will generate `modal_test_output.png`.

## API Response Format

The endpoint returns JSON with a base64-encoded image:

```json
{
  "success": true,
  "image": "data:image/png;base64,iVBORw0KG...",
  "model": "stable-diffusion-v1-5",
  "provider": "modal"
}
```

## Model Details

- **Model**: Stable Diffusion 1.5 (runwayml/stable-diffusion-v1-5)
- **Optimal Size**: 512x512 pixels
- **GPU**: A10G (fast and cost-effective)
- **Inference Steps**: 25 (good quality/speed balance)
- **Guidance Scale**: 7.5 (standard)

## Costs

Modal charges for:
- GPU time: ~$0.001/second on A10G
- Storage: ~$0.10/GB/month for model weights
- Network: Free egress

Typical image generation:
- Cold start: ~30 seconds (~$0.03) - happens after 2 min idle
- Warm generation: ~2-5 seconds (~$0.002-0.005)

The container stays warm for 2 minutes after last use, so consecutive requests are fast and cheap.

## Benefits

1. **Reliable**: Modal's infrastructure is production-grade
2. **Cost-effective**: Pay only for GPU time used, no API key costs
3. **Fast**: A10G GPU generates images in 2-5 seconds when warm
4. **Scalable**: Automatically scales to handle traffic
5. **No maintenance**: Modal handles all infrastructure
6. **Self-hosted**: You control the deployment and costs

## Monitoring

View your deployment status and logs:

```bash
# List all apps
modal app list

# View logs
modal app logs writersarcade-image-gen
```

Or visit the Modal dashboard:
https://modal.com/apps/papaandthejimjams/main/deployed/writersarcade-image-gen

## Redeployment

To update the service:

```bash
cd scripts/modal
modal deploy modal_image_gen.py
```

The URL will remain the same, so no environment variable changes needed.

## Environment Variables

Add to your `.env.local` file (gitignored):

```bash
MODAL_IMAGE_GEN_URL="your-modal-endpoint-url-here"
```

**Get your endpoint URL from Modal dashboard after deployment.**

**Security:** This URL should be kept private as it allows access to your GPU resources.

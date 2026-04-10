# Modal Scripts

This directory contains scripts for deploying and testing the Modal image generation service.

## Files

- `modal_image_gen.py` - Modal deployment script for Stable Diffusion 1.5
- `test-modal-integration.js` - Test script to verify the deployed endpoint

## Usage

### Deploy to Modal

```bash
cd scripts/modal
modal deploy modal_image_gen.py
```

### Test Locally

```bash
cd scripts/modal
modal run modal_image_gen.py --prompt "A test image"
```

This generates `modal_test_output.png` in this directory.

### Test Deployed Endpoint

```bash
# From project root
node scripts/modal/test-modal-integration.js
```

## Documentation

See [../../docs/MODAL_SETUP.md](../../docs/MODAL_SETUP.md) for complete setup instructions.

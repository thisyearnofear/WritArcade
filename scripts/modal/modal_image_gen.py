"""
Modal Flux.1-schnell Image Generation Service
Deploy with: modal deploy modal_image_gen.py
"""

import modal

# Create Modal app
app = modal.App("writersarcade-image-gen")

# Define the container image with dependencies
# Using 0.31.0+ for better Flux support
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers==0.31.0",
        "transformers==4.45.1",
        "accelerate==0.34.2",
        "sentencepiece==0.2.0",
        "torch==2.4.1",
        "fastapi[standard]",
    )
)

# Create a class to handle image generation
@app.cls(
    image=image,
    gpu="A10G",  # Flux.1-schnell runs well on A10G (24GB VRAM)
    timeout=300,
    scaledown_window=120,
    # secrets=[modal.Secret.from_name("huggingface-secret")] # Uncomment if using gated models
)
class FluxModel:
    @modal.enter()
    def load_model(self):
        """Load model when container starts"""
        from diffusers import FluxPipeline
        import torch
        
        # Flux.1-schnell is a 12B parameter model, optimized for 4 steps
        self.pipe = FluxPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-schnell",
            torch_dtype=torch.bfloat16,
        ).to("cuda")
    
    @modal.method()
    def generate(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        num_inference_steps: int = 4, # Schnell is optimized for 4 steps
    ) -> bytes:
        """Generate image from prompt"""
        import io
        
        # Generate image
        # Schnell doesn't use guidance_scale (set to 0.0)
        image = self.pipe(
            prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=0.0,
        ).images[0]
        
        # Convert to bytes
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()
    
    @modal.fastapi_endpoint(method="POST")
    def web_generate(self, request_data: dict):
        """Web endpoint for image generation"""
        import base64
        import time
        
        start_time = time.time()
        prompt = request_data.get("prompt", "")
        if not prompt:
            return {"error": "prompt is required"}, 400
        
        # Flux works best at 1024x1024 native
        width = request_data.get("width", 1024)
        height = request_data.get("height", 1024)
        
        print(f"Generating image for prompt: {prompt[:100]}...")
        
        try:
            # Generate image
            image_bytes = self.generate.local(
                prompt=prompt,
                width=width,
                height=height,
            )
            
            # Return base64 encoded image
            image_b64 = base64.b64encode(image_bytes).decode()
            
            duration = time.time() - start_time
            print(f"Generation complete in {duration:.2f}s")
            
            return {
                "success": True,
                "image": f"data:image/png;base64,{image_b64}",
                "model": "flux-1-schnell",
                "provider": "modal",
                "duration": duration
            }
        except Exception as e:
            print(f"Error generating image: {str(e)}")
            return {"error": str(e), "success": False}, 500


# CLI for testing
@app.local_entrypoint()
def main(prompt: str = "A professional comic book panel of a detective in a noir city, bold lines"):
    """Test the image generation locally"""
    
    print(f"Generating image for: {prompt}")
    
    model = FluxModel()
    image_bytes = model.generate.remote(prompt=prompt)
    
    # Save to file
    filename = "flux_test_output.png"
    with open(filename, "wb") as f:
        f.write(image_bytes)
    
    print(f"Image saved to {filename}")

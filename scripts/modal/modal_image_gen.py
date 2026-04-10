"""
Modal Stable Diffusion Image Generation Service
Deploy with: modal deploy modal_image_gen.py
"""

import modal

# Create Modal app
app = modal.App("writersarcade-image-gen")

# Define the container image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers==0.30.3",
        "transformers==4.44.2",
        "accelerate==0.34.2",
        "safetensors==0.4.5",
        "torch==2.4.1",
        "fastapi[standard]",  # Required for fastapi_endpoint
    )
)

# Download model during image build
with image.imports():
    from diffusers import StableDiffusionPipeline
    import torch
    
    # This runs during container build
    StableDiffusionPipeline.from_pretrained(
        "runwayml/stable-diffusion-v1-5",
        torch_dtype=torch.float16,
        use_safetensors=True,
    )

# Create a class to handle image generation
@app.cls(
    image=image,
    gpu="A10G",  # Fast and cost-effective GPU
    timeout=300,  # 5 minute timeout
    scaledown_window=120,  # Keep warm for 2 minutes
)
class StableDiffusion:
    @modal.enter()
    def load_model(self):
        """Load model when container starts"""
        from diffusers import StableDiffusionPipeline
        import torch
        
        self.pipe = StableDiffusionPipeline.from_pretrained(
            "runwayml/stable-diffusion-v1-5",
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        self.pipe.to("cuda")
        # Enable memory optimizations
        self.pipe.enable_attention_slicing()
    
    @modal.method()
    def generate(
        self,
        prompt: str,
        width: int = 512,  # SD 1.5 works best at 512x512
        height: int = 512,
        num_inference_steps: int = 25,
        guidance_scale: float = 7.5,
    ) -> bytes:
        """Generate image from prompt"""
        import io
        
        # Generate image
        image = self.pipe(
            prompt,
            width=width,
            height=height,
            num_inference_steps=num_inference_steps,
            guidance_scale=guidance_scale,
        ).images[0]
        
        # Convert to bytes
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        return buf.getvalue()
    
    @modal.fastapi_endpoint(method="POST")
    def web_generate(self, request_data: dict):
        """Web endpoint for image generation"""
        import base64
        
        prompt = request_data.get("prompt", "")
        if not prompt:
            return {"error": "prompt is required"}, 400
        
        width = request_data.get("width", 512)
        height = request_data.get("height", 512)
        
        # Generate image
        image_bytes = self.generate.local(
            prompt=prompt,
            width=width,
            height=height,
        )
        
        # Return base64 encoded image
        image_b64 = base64.b64encode(image_bytes).decode()
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{image_b64}",
            "model": "stable-diffusion-v1-5",
            "provider": "modal",
        }


# CLI for testing
@app.local_entrypoint()
def main(prompt: str = "A comic book panel showing a futuristic city"):
    """Test the image generation locally"""
    
    print(f"Generating image for: {prompt}")
    
    sd = StableDiffusion()
    image_bytes = sd.generate.remote(prompt=prompt)
    
    # Save to file
    with open("modal_test_output.png", "wb") as f:
        f.write(image_bytes)
    
    print("Image saved to modal_test_output.png")

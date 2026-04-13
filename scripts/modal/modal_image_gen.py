"""
Modal SDXL Turbo Image Generation Service
Deploy with: modal deploy modal_image_gen.py
"""

import modal

# Create Modal app
app = modal.App("writersarcade-image-gen")

# Define the container image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers==0.31.0",
        "transformers==4.45.1",
        "accelerate==0.34.2",
        "safetensors==0.4.5",
        "torch==2.4.1",
        "fastapi[standard]",
    )
)

# Create a class to handle image generation
@app.cls(
    image=image,
    gpu="A10G",  # SDXL Turbo runs well on A10G
    timeout=300,
    scaledown_window=120,
)
class SDXLModel:
    @modal.enter()
    def load_model(self):
        """Load model when container starts"""
        from diffusers import AutoPipelineForText2Image
        import torch
        
        # SDXL Turbo is a high-quality model that generates in 1-4 steps
        # Usually not gated, making it easier to deploy
        self.pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        ).to("cuda")
    
    @modal.method()
    def generate(
        self,
        prompt: str,
        width: int = 512,  # Turbo is optimized for 512x512 but can do 1024
        height: int = 512,
        num_inference_steps: int = 2, # Turbo is extremely fast
    ) -> bytes:
        """Generate image from prompt"""
        import io
        
        # Generate image
        # Turbo works best with guidance_scale=0.0 or 1.0
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
        
        # Turbo is very fast, we can use 1024x1024 if requested
        width = request_data.get("width", 512)
        height = request_data.get("height", 512)
        
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
                "model": "sdxl-turbo",
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
    
    model = SDXLModel()
    image_bytes = model.generate.remote(prompt=prompt)
    
    # Save to file
    filename = "sdxl_test_output.png"
    with open(filename, "wb") as f:
        f.write(image_bytes)
    
    print(f"Image saved to {filename}")

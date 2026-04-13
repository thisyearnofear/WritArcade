"""
Modal SDXL Turbo Image Generation Service
Deploy with: modal deploy modal_image_gen.py
"""

import modal

app = modal.App("writersarcade-image-gen")

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

@app.cls(
    image=image,
    gpu="A10G",
    timeout=300,
    scaledown_window=120,
)
class SDXLModel:
    @modal.enter()
    def load_model(self):
        from diffusers import AutoPipelineForText2Image
        import torch
        self.pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16"
        ).to("cuda")

    @modal.fastapi_endpoint(method="POST")
    def generate(self, request_data: dict):
        import base64
        import io
        
        prompt = request_data.get("prompt", "")
        if not prompt:
            return {"error": "prompt is required"}
            
        image = self.pipe(
            prompt,
            width=512,
            height=512,
            num_inference_steps=2,
            guidance_scale=0.0,
        ).images[0]
        
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        
        return {
            "success": True,
            "image": f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode()}",
            "model": "sdxl-turbo",
            "provider": "modal"
        }

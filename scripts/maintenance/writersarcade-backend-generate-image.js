/**
 * Image generation with persistent fallback chain & in-flight deduplication.
 * Priority: Pollinations (free) → Venice (works) → Netmind → Modal
 *
 * Because this runs as a long-lived process the IN_FLIGHT map and provider
 * health tracking actually persist across requests — unlike serverless.
 */

// ─── In-flight deduplication ───────────────────────────────────────────
const IN_FLIGHT = new Map();

function requestKey(prompt, model, provider) {
  return `${provider}::${model}::${prompt.slice(0, 200)}`;
}

// ─── Provider health tracking (persists across requests!) ──────────────
const providerHealth = {
  pollinations: { failures: 0, lastSuccess: Date.now() },
  venice: { failures: 0, lastSuccess: Date.now() },
  netmind: { failures: 0, lastSuccess: Date.now() },
  modal: { failures: 0, lastSuccess: Date.now() },
};

// ─── Provider implementations ──────────────────────────────────────────

async function callPollinationsAPI(prompt) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

    const response = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Pollinations] Image generation failed:', response.status);
      providerHealth.pollinations.failures++;
      return { imageUrl: null, success: false };
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const base64Url = `data:image/jpeg;base64,${base64}`;

    providerHealth.pollinations.failures = 0;
    providerHealth.pollinations.lastSuccess = Date.now();
    console.log('[Pollinations] Image generated successfully');
    return { imageUrl: base64Url, success: true };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[Pollinations] Request timeout after 50s');
    } else {
      console.error('[Pollinations] Request failed:', err.message);
    }
    providerHealth.pollinations.failures++;
    return { imageUrl: null, success: false };
  }
}

async function callModalAPI(prompt) {
  const modalUrl = process.env.MODAL_IMAGE_GEN_URL;
  if (!modalUrl) {
    return { imageUrl: null, success: false };
  }
  try {
    const res = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 512, height: 512 }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[Modal] API error:', res.status, txt);
      providerHealth.modal.failures++;
      return { imageUrl: null, success: false };
    }
    const data = await res.json();
    const imageUrl = data.image || null;
    if (imageUrl) {
      providerHealth.modal.failures = 0;
      providerHealth.modal.lastSuccess = Date.now();
    }
    return { imageUrl, success: !!imageUrl };
  } catch (err) {
    console.error('[Modal] Request failed:', err.message);
    providerHealth.modal.failures++;
    return { imageUrl: null, success: false };
  }
}

async function callNetmindAPI(prompt, model) {
  const apiKey = process.env.NETMIND_API_KEY;
  if (!apiKey) return { imageUrl: null, success: false };
  try {
    const res = await fetch(
      'https://api.netmind.ai/inference-api/openai/v1/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, prompt, response_format: 'b64_json' }),
      }
    );
    if (!res.ok) {
      const txt = await res.text();
      console.error('[Netmind] API error:', res.status, txt);
      providerHealth.netmind.failures++;
      return { imageUrl: null, success: false };
    }
    const data = await res.json();
    const imageUrl = data.data?.[0]?.b64_json
      ? `data:image/png;base64,${data.data[0].b64_json}`
      : null;
    if (imageUrl) {
      providerHealth.netmind.failures = 0;
      providerHealth.netmind.lastSuccess = Date.now();
    }
    return { imageUrl, success: !!imageUrl };
  } catch (err) {
    console.error('[Netmind] Request failed:', err.message);
    providerHealth.netmind.failures++;
    return { imageUrl: null, success: false };
  }
}

async function callVeniceAPI(prompt, model) {
  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return { imageUrl: null, success: false };
  try {
    const res = await fetch('https://api.venice.ai/api/v1/image/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        model,
        width: 1024,
        height: 1024,
        format: 'png',
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[Venice] API error:', res.status, txt);
      if (res.status === 402) {
        console.warn('[Venice] Credits exhausted — skipping for future requests');
        providerHealth.venice.failures += 10;
      } else {
        providerHealth.venice.failures++;
      }
      return { imageUrl: null, success: false };
    }
    const data = await res.json();
    const imageUrl = data.images?.[0]
      ? `data:image/png;base64,${data.images[0]}`
      : null;
    if (imageUrl) {
      providerHealth.venice.failures = 0;
      providerHealth.venice.lastSuccess = Date.now();
    }
    return { imageUrl, success: !!imageUrl };
  } catch (err) {
    console.error('[Venice] Request failed:', err.message);
    providerHealth.venice.failures++;
    return { imageUrl: null, success: false };
  }
}

// ─── Smart provider selection based on health ──────────────────────────

function selectDefaultProvider() {
  // Primary: Pollinations (free, no API key) - always try first
  if (providerHealth.pollinations.failures < 10) {
    return 'pollinations';
  }
  
  // Fallback: Venice (works, has credits)
  if (process.env.VENICE_API_KEY && providerHealth.venice.failures < 5) {
    return 'venice';
  }
  
  // Fallback: Netmind (if configured)
  if (process.env.NETMIND_API_KEY && providerHealth.netmind.failures < 5) {
    return 'netmind';
  }
  
  // Fallback: Modal (if configured)
  if (process.env.MODAL_IMAGE_GEN_URL && providerHealth.modal.failures < 5) {
    return 'modal';
  }
  
  // Ultimate fallback: try pollinations anyway
  return 'pollinations';
}

function defaultModelForProvider(provider) {
  if (provider === 'pollinations') return 'flux';
  if (provider === 'modal') return 'stable-diffusion-v1-5';
  if (provider === 'netmind') return 'black-forest-labs/FLUX.1-schnell';
  return 'venice-sd35';
}

// ─── Route ─────────────────────────────────────────────────────────────

async function routes(fastify) {
  fastify.post('/', async (request, reply) => {
    const { prompt, type, model, provider } = request.body || {};

    if (!prompt || !type) {
      return reply.code(400).send({ error: 'Missing prompt or type' });
    }

    const selectedProvider = provider || selectDefaultProvider();
    const selectedModel = model || defaultModelForProvider(selectedProvider);
    const key = requestKey(prompt, selectedModel, selectedProvider);

    // Deduplicate in-flight
    const existing = IN_FLIGHT.get(key);
    if (existing) {
      request.log.info('Deduplicating in-flight image request');
      return reply.send(await existing);
    }

    const upstreamPromise = (async () => {
      request.log.info(
        `[Image] Generating with ${selectedProvider} / ${selectedModel}`
      );

      // Call provider function
      const callProvider = (p, m) => {
        if (p === 'pollinations') return callPollinationsAPI(prompt);
        if (p === 'modal') return callModalAPI(prompt);
        if (p === 'netmind') return callNetmindAPI(prompt, m);
        return callVeniceAPI(prompt, m);
      };

      let result = await callProvider(selectedProvider, selectedModel);
      if (result.success && result.imageUrl) {
        request.log.info(`[Image] Primary ${selectedProvider} succeeded`);
        return {
          imageUrl: result.imageUrl,
          model: selectedModel,
          provider: selectedProvider,
        };
      }
      request.log.warn(`[Image] Primary ${selectedProvider} failed`);

      // Fallback chain: pollinations → venice → netmind → modal (skip already tried)
      const chain = [
        { provider: 'pollinations', model: 'flux' },
        { provider: 'venice', model: 'venice-sd35' },
        { provider: 'netmind', model: 'black-forest-labs/FLUX.1-schnell' },
        { provider: 'modal', model: 'stable-diffusion-v1-5' },
      ].filter((f) => f.provider !== selectedProvider);

      for (const fb of chain) {
        request.log.info(
          `[Image] Trying fallback: ${fb.provider} / ${fb.model}`
        );
        result = await callProvider(fb.provider, fb.model);
        if (result.success && result.imageUrl) {
          request.log.info(`[Image] Fallback ${fb.provider} succeeded`);
          return {
            imageUrl: result.imageUrl,
            model: fb.model,
            provider: fb.provider,
          };
        }
        request.log.warn(`[Image] Fallback ${fb.provider} failed`);
      }

      request.log.error('[Image] All providers failed');
      return { imageUrl: null, model: selectedModel, provider: 'failed' };
    })();

    IN_FLIGHT.set(key, upstreamPromise);
    try {
      const result = await upstreamPromise;
      return reply.send(result);
    } finally {
      IN_FLIGHT.delete(key);
    }
  });

  // Health / stats endpoint
  fastify.get('/health', async () => ({
    status: 'ok',
    providers: {
      pollinations: { configured: true, ...providerHealth.pollinations },
      venice: { configured: !!process.env.VENICE_API_KEY, ...providerHealth.venice },
      netmind: { configured: !!process.env.NETMIND_API_KEY, ...providerHealth.netmind },
      modal: { configured: !!process.env.MODAL_IMAGE_GEN_URL, ...providerHealth.modal },
    },
  }));
}

module.exports = routes;
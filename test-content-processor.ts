import { ContentProcessorService } from './domains/content/services/content-processor.service';

(async () => {
  const url = 'https://paragraph.com/@empresstrash/summerween-glitch-songs-of-the-summer';
  try {
    const result = await ContentProcessorService.processUrl(url);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
})();
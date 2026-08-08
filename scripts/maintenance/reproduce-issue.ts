
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reproduce() {
  console.log('--- Starting Reproduction ---');
  
  const payload = {
    url: 'https://paragraph.xyz/@fred/the-future-of-ai',
    customization: {
      genre: 'horror',
      difficulty: 'easy'
    },
    payment: {
      writerCoinId: 'avc'
    }
  };

  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    // We can't easily call the API route directly from a script because of Next.js environment
    // But we can try to call the underlying services.
    
    const { GameAIService } = await import('../domains/games/services/game-ai.service');
    const { ContentProcessorService } = await import('../domains/content/services/content-processor.service');
    const { GameDatabaseService } = await import('../domains/games/services/game-database.service');
    const { UserAIPreferenceService } = await import('../lib/user-ai-preferences.service');

    console.log('\n1. Testing ContentProcessorService.processUrl...');
    // Mocking processUrl because it might fail without real network or Paragraph SDK setup
    // But let's see if it works or how it fails.
    try {
        const processedContent = await ContentProcessorService.processUrl(payload.url);
        console.log('Content processed successfully:', processedContent.title);
    } catch (e) {
        console.error('ContentProcessorService failed (expected if network/env missing):', e.message);
    }

    console.log('\n2. Testing GameAIService.generateGame...');
    const userPreferences = { geminiEnabled: false, preferGemini: false };
    try {
        const gameRequest = {
            promptText: 'Create a horror game about AI taking over the world.',
            customization: payload.customization,
            payment: payload.payment
        };
        const aiGameData = await GameAIService.generateGame(gameRequest, 0, userPreferences);
        console.log('AI Generation successful:', aiGameData.title);
    } catch (e) {
        console.error('GameAIService failed:', e.message);
        if (e.stack) console.error(e.stack);
    }

    console.log('\n3. Testing GameDatabaseService.createGame...');
    try {
        const mockGameData = {
            title: 'Test Game ' + Date.now(),
            description: 'A test game description',
            tagline: 'Test tagline',
            genre: 'horror',
            subgenre: 'survival',
            primaryColor: '#ff0000',
            promptName: 'test-prompt',
            promptText: 'test prompt text',
            promptModel: 'gpt-4o-mini'
        };
        const savedGame = await GameDatabaseService.createGame(mockGameData, undefined, {
            articleUrl: payload.url,
            writerCoinId: payload.payment.writerCoinId,
            difficulty: payload.customization.difficulty
        });
        console.log('Game saved successfully:', savedGame.id);
    } catch (e) {
        console.error('GameDatabaseService failed:', e.message);
        if (e.stack) console.error(e.stack);
    }

  } catch (error) {
    console.error('Reproduction failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

reproduce();

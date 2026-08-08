import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding marketplace assets...')

    const assets = [
        {
            title: "Vitalik's Quantum Shield",
            description: "A rare defensive item from the Ethereum ecosystem.",
            type: "mechanic",
            genre: "Crypto-Fantasy",
            content: JSON.stringify({
                name: "Vitalik's Quantum Shield",
                description: "A rare defensive item from the Ethereum ecosystem.",
                mechanics: ["Blocks one harsh critique per turn", "Gas fee protection"],
                consequence: "Uses 10 Gas"
            })
        },
        {
            title: "Pixel Art City",
            description: "A gloomy cyberpunk cityscape perfect for noir adventures.",
            type: "visual", // 'visual' isn't technically in my list earlier but schema says String. I should probably use 'world' or 'visual'. 'visual' matches my plan.
            genre: "Cyberpunk",
            content: JSON.stringify({
                artStyle: "Pixel Art",
                atmosphere: "Neon Noir",
                colorPalette: ["#FF00FF", "#00FFFF", "#000000"],
                symbolism: "Glitchy holograms"
            })
        },
        {
            title: "The Dilution Demon",
            description: "A startup founder's worst nightmare.",
            type: "character",
            genre: "Startup Horror",
            content: JSON.stringify({
                name: "The Dilution Demon",
                role: "Antagonist",
                personality: "Greedy, relentless, mathematical",
                motivation: "To reduce founder equity to zero",
                appearance: "A suit made of burning term sheets"
            })
        }
    ]

    for (const asset of assets) {
        // Check if exists
        const existing = await prisma.asset.findFirst({
            where: { title: asset.title }
        })

        if (!existing) {
            await prisma.asset.create({
                data: asset
            })
            console.log(`Created: ${asset.title}`)
        } else {
            console.log(`Skipped: ${asset.title} (Exists)`)
        }
    }

    console.log('Seeding complete.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })

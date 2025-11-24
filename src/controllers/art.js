const log = require("debug")("ia:controllers:art");

const fs = require("fs");
const Jimp = require("jimp");

const Game = require("../models/game");
const GenerateGameArt = require("../services/GenerateGameArt");

async function generate(req, res) {
    try {
        const { game_id, chat_id } = req.query;
        if (game_id && !chat_id) {
            const game = await Game.findOne({ where: { id: game_id } });
            if (!game) throw new Error(`game with id ${game_id} not found`);

            const filename = `./public/images/art/${game.id}.png`;
            const filename_256 = `./public/images/art/${game.id}-256.png`;
            const filename_50 = `./public/images/art/${game.id}-50.png`;

            if (fs.existsSync(filename)) {
                return res.redirect(`/images/art/${game.id}.png`);
            }

            let model = (req.user ? req.user.model : process.env.AI_MODEL);

            const art = await GenerateGameArt(game.llm_fields, model);
            if (!art) throw new Error(`art not generated`);

            if (art.image_data) {

                const image = await Jimp.read(art.image_data);
                
                // Convert to PNG
                image.png();
                
                await image.writeAsync(filename);
                
                // Create 256x256 thumbnail
                const image256 = image.clone().resize(256, 256);
                await image256.writeAsync(filename_256);
                
                // Create 50x50 thumbnail  
                const image50 = image.clone().resize(50, 50);
                await image50.writeAsync(filename_50);

                delete art.image_data;
            }


            await Game.update(art, { where: { id: game.id } });

            return res.redirect(`/images/art/${game.id}.png`);
        } else {
            throw new Error(`invalid request parameters`);
        }
    } catch (e) {
        return res.json({
            status: "error",
            message: `error generating game art: ${e.message}`
        });
    }
}

module.exports = {
    generate,
};

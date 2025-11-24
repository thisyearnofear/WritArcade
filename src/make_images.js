require("dotenv").config();

const log = require("debug")("ia:make_images");

const fs = require("fs");
const Jimp = require("jimp");

const Database = require("./database");
const Game = require("./models/game");

(async function main() {
    await Database.initialize();

    const games = await Game.findAll({});
    console.log(games.length);
    for (const game of games) {
        const filename = `./public/images/art/${game.id}.png`;
        const filename_256 = `./public/images/art/${game.id}-256.png`;
        const filename_50 = `./public/images/art/${game.id}-50.png`;
        if (fs.existsSync(filename)) {
            console.log("- already has image");
            continue;
        }

        if (game.image_data) {
            console.log(`- generating ${filename}`);

            const image = await Jimp.read(game.image_data);
            image.png();
            
            await image.writeAsync(filename);
            
            const image256 = image.clone().resize(256, 256);
            await image256.writeAsync(filename_256);
            
            const image50 = image.clone().resize(50, 50);
            await image50.writeAsync(filename_50);
        }
    }
})();
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const source = 'C:\\Users\\sivak\\.gemini\\antigravity\\brain\\6760203c-9d8a-462d-bb5a-2722596e3298\\media__1784319626998.jpg';

const sizes = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192
};

const go = async () => {
    try {
        for (const [res, size] of Object.entries(sizes)) {
            const folder = `android/app/src/main/res/mipmap-${res}`;
            if (!fs.existsSync(folder)) continue;

            const buffer = await sharp(source).resize(size, size).png().toBuffer();
            const circleBuffer = await sharp(buffer)
                .composite([{ input: Buffer.from(`<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`), blend: 'dest-in' }])
                .png()
                .toBuffer();

            fs.writeFileSync(`${folder}/ic_launcher.png`, buffer);
            fs.writeFileSync(`${folder}/ic_launcher_round.png`, circleBuffer);
            fs.writeFileSync(`${folder}/ic_launcher_foreground.png`, buffer);

            console.log(`Wrote ${folder}`);
        }

        // public web root
        const webicon = await sharp(source).resize(512, 512).png().toBuffer();
        fs.writeFileSync('public/icon.png', webicon);
        console.log("Wrote public/icon.png");

    } catch (err) {
        console.error("Error creating icons", err);
    }
};

go();

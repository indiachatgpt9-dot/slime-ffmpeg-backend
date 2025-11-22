const express = require("express");
const multer = require("multer");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.post("/process", upload.single("video"), (req, res) => {
    const input = req.file.path;
    const output = `output_${Date.now()}.mp4`;

    const {
        contrast,
        brightness,
        saturate,
        hue,
        grain,
        speed,
        resolution
    } = req.body;

    let filters = `eq=contrast=${contrast}:brightness=${brightness}:saturation=${saturate}`;
    if (hue != 0) filters += `,hue=h=${hue}`;
    if (grain > 0) filters += `,noise=alls=${grain}:allf=t+u`;
    
    if (resolution !== "original") {
        filters += `,scale=-2:${resolution}`;
    }

    const pts = 1 / speed;

    const cmd = `
        ffmpeg -y -i ${input}
        -vf "${filters},setpts=${pts}*PTS"
        -af "atempo=${speed}"
        -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p
        -c:a aac -b:a 192k
        ${output}
    `;

    exec(cmd, async (err) => {
        if (err) {
            console.error(err);
            res.status(500).send("FFmpeg error");
            return;
        }

        res.download(output, "slime_export.mp4", () => {
            fs.unlinkSync(input);
            fs.unlinkSync(output);
        });
    });
});

app.listen(3000, () => {
    console.log("FFmpeg server running on port 3000");
});

require("dotenv").config();
const RPC = require("discord-rpc");
const { getEvent, getNowPlaying } = require("./lastfm");
const client = new RPC.Client({ transport: "ipc" });

if (!process.env.DISCORD_CLIENT_ID || !process.env.LAST_FM_API_KEY || !process.env.LAST_FM_SECRET || !process.env.LAST_FM_USERNAME) {
    throw new Error("You must specify a DISCORD_CLIENT_ID, LAST_FM_API_KEY, LAST_FM_SECRET and a LAST_FM_USERNAME environment variable.");
}

const clientId = process.env.DISCORD_CLIENT_ID;

RPC.register(clientId);

client.on("ready", () => {
    let prev;
    setInterval(async() => {
        try {
            // Attempt to get the track now playing on user's Last.fm profile.
            const curr = await getNowPlaying({
                username: process.env.LAST_FM_USERNAME,
                apiKey: process.env.LAST_FM_API_KEY,
            });
            // Get the event currently occuring by comparing the previous track polled to the latest.
            const { event, track } = getEvent(prev, curr);

            //console.log(track.image[2]['#text']);

            // A new track is now playing, so set the discord status to that track.
            if (event === "nowPlaying") {
                const startTimestamp = Math.round(Date.now() / 1000);
                //client.user.setActivity('Yandex Music', { type: 'Listening' });
                let img = "";
                
                if(track.image[2]['#text'])
                img = track.image[2]['#text'];

                await client.setActivity({
                    details: track.name,
                    state: `${track.artist['#text']}`,
                    startTimestamp: startTimestamp-5,
                    largeImageKey: img,
                    largeImageText: track.name + " - " + track.artist['#text'],
                    smallImageKey: process.env.SMALL_IMAGE_KEY,
                    smallImageText: process.env.SMALL_IMAGE_TOOLTIP,
                    instance: true,
                    buttons: [
                        {label: "СЛУШАТЬ", url:"https://music.yandex.ru/search?text=" + encodeURIComponent(track.name + " - " + track.artist['#text'])}
                    ]
                });
                console.log(`Now playing ${track.name} by ${track.artist['#text']}`);

            // Track stopped playing, so clear the Discord status.
            } else if (event === "stoppedPlaying") {
                await client.clearActivity();
                console.log(`Stopped playing ${track.name} by ${track.artist['#text']}`);
            }

            // Set the previous track to the current, to be compared to a new track in the next iteration.
            prev = curr;
        } catch (err) {
            console.error(err);
        }
    }, 5000);
});

client.login({ clientId }).catch(console.error);

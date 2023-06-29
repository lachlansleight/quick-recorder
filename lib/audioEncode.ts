import audioBufferToWav from "audiobuffer-to-wav";
import lamejs from "lamejstmp";

const decodeAudioDataAsync = async (
    ctx: AudioContext,
    buffer: ArrayBuffer
): Promise<AudioBuffer> => {
    return new Promise((resolve, reject) => {
        ctx.decodeAudioData(buffer, resolve, reject);
    });
};

export const chunksToWav = async (chunks: Blob[]): Promise<Blob> => {
    const ctx = new (window["AudioContext"] || window["webkitAudioContext" as any])();
    if (!ctx) throw new Error("Failed to create audio context");

    await new Promise(resolve => setTimeout(resolve, 100));

    //Get wav buffer
    const rawBuffer = await new Blob(chunks).arrayBuffer();
    const audioBuffer = await decodeAudioDataAsync(ctx, rawBuffer);
    const wavBuffer = audioBufferToWav(audioBuffer);

    return new Blob([wavBuffer], { type: "audio/wav" });
};

export const chunksToMp3 = async (chunks: Blob[]): Promise<Blob> => {
    const ctx = new (window["AudioContext"] || window["webkitAudioContext" as any])();
    if (!ctx) throw new Error("Failed to create audio context");

    await new Promise(resolve => setTimeout(resolve, 100));

    //Get wav buffer
    const rawBuffer = await new Blob(chunks).arrayBuffer();
    const audioBuffer = await decodeAudioDataAsync(ctx, rawBuffer);
    const wavBuffer = audioBufferToWav(audioBuffer);

    //Conver to mp3
    const mp3encoder = new lamejs.Mp3Encoder(1, 44100, 128); //mono 44.1khz encode to 128kbps
    const samples = new Int16Array(wavBuffer);
    const mp3 = mp3encoder.encodeBuffer(samples);
    const data = [mp3, mp3encoder.flush()];
    return new Blob(data, { type: "audio/mp3" });

    //const ffmpeg = createFFmpeg({ corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js", log: true });
    //await ffmpeg.load();
    //const mp3Output = new Uint8Array(wavBuffer);
    //ffmpeg.FS("writeFile", "input.wav", mp3Output);
    //await ffmpeg.run("-i", "input.wav", "output.mp3");
    //const data = ffmpeg.FS("readFile", "output.mp3");
    //const mp3Blob = new Blob([data.buffer], { type: "audio/mp3" });
    //return mp3Blob;
};

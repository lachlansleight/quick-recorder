declare module "lamejstmp" {
    export default class lamejs {
        public static Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => {
            encodeBuffer(samples: Int16Array): Int8Array;
            flush(): Int8Array;
        };
    }
}

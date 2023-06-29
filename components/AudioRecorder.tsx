import { useCallback, useEffect, useRef, useState } from "react";
import {
    FaCheck,
    FaExclamationTriangle,
    FaMicrophone,
    FaPlay,
    FaStop,
    FaSync,
    FaTrash,
} from "react-icons/fa";
import useAnimationFrame from "lib/hooks/useAnimationFrame";
import { chunksToMp3 } from "lib/audioEncode";
import { formatTime } from "lib/text";

export type RecorderState = "no-device" | "inactive" | "recording" | "converting" | "done";
export interface RecordingData {
    offerId?: string;
    offerSource?: string;
    filename: string;
    filesize: number;
    duration: number;
    averageVolume: number;
    url: string;
    date?: Date;
}

const AudioRecorder = ({
    maxTime = null,
    onReceiveBuffer,
    onRecordingStateChange,
    onFinished,
}: {
    maxTime?: number | null;
    onReceiveBuffer: (blob: Blob | null) => void;
    onRecordingStateChange?: (state: RecorderState) => void;
    onFinished?: () => void;
}) => {
    const chunks = useRef<Blob[]>([]);
    const circleFill = useRef<SVGCircleElement>(null);
    const volumeRing = useRef<SVGCircleElement>(null);
    const [state, setState] = useState<RecorderState>("no-device");
    const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [error, setError] = useState("");
    const [src, setSrc] = useState<string>("");
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentDuration, setCurrentDuration] = useState(0);

    const ctx = useRef<AudioContext | null>(null);
    const analyzeData = useRef<Uint8Array>(new Uint8Array(0));
    const duration = useRef(0);

    const handleBuffer = (data: Blob) => {
        setSrc(URL.createObjectURL(data));
    };

    useEffect(() => {
        const setup = async () => {
            if (!navigator.mediaDevices) {
                setError("Audio recording permission denied, or not supported on this browser");
                return;
            }

            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                console.log(devices);
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setRecorder(new MediaRecorder(stream));
                setState("inactive");
                console.log("Created audio recorder");

                if (!ctx.current) {
                    ctx.current = new (window["AudioContext"] ||
                        window["webkitAudioContext" as any])();
                }
                if (!ctx.current) throw new Error("Failed to create audio context");

                const analyser = ctx.current.createAnalyser();
                analyser.fftSize = 128;
                analyzeData.current = new Uint8Array(analyser.frequencyBinCount);
                const source = ctx.current.createMediaStreamSource(stream);
                source.connect(analyser);

                setAnalyser(analyser);
            } catch (err: any) {
                setError("Failed to start audio recording");
                console.log(err);
                return;
            }
        };
        if (!ctx.current) setup();
    }, [ctx]);

    useEffect(() => {
        if (!recorder) return;

        const handleData = (e: BlobEvent) => {
            chunks.current.push(e.data);
        };

        recorder.ondataavailable = handleData;

        return () => {
            recorder.ondataavailable = null;
        };
    }, [recorder]);

    const startRecording = useCallback(() => {
        if (!recorder) return;

        chunks.current = [];
        recorder.start();
        setState("recording");
    }, [recorder]);

    const stopRecording = useCallback(() => {
        if (!recorder) return;
        if (state !== "recording") return;

        recorder.stop();
        setState("converting");

        createWavBuffer().then(blob => {
            onReceiveBuffer(blob);
            handleBuffer(blob);
            setState("done");
        });
    }, [recorder, state]);

    useEffect(() => {
        if (onRecordingStateChange) onRecordingStateChange(state);
    }, [state, onRecordingStateChange]);

    const startTime = useRef(0);
    const averages = useRef<number[]>([]);
    useAnimationFrame(
        ({ time }: { time: number }) => {
            if (state === "recording") {
                if (!startTime.current) startTime.current = time;
                duration.current = time - startTime.current;
                setCurrentDuration(duration.current);
                if (circleFill.current) {
                    if (maxTime != null) {
                        circleFill.current.style.strokeDashoffset = `${
                            326.7256 - (duration.current / (maxTime > 0 ? maxTime : 1)) * 326.7256
                        }`;
                    } else {
                        circleFill.current.style.display = "none";
                    }
                }

                if (analyser) {
                    analyser.getByteFrequencyData(analyzeData.current);
                    let average = 0;
                    for (let i = 0; i < analyzeData.current.length; i++) {
                        average += analyzeData.current[i];
                    }
                    average /= analyzeData.current.length;
                    averages.current.push(average);
                    if (volumeRing.current) {
                        volumeRing.current.setAttribute("r", `${20 + (average / 256) * 20}`);
                    }
                }

                if (maxTime != null && maxTime > 0 && duration.current > maxTime) {
                    stopRecording();
                }
            } else {
                startTime.current = 0;
                if (volumeRing.current) volumeRing.current.setAttribute("r", "0");
                if (circleFill.current) circleFill.current.style.strokeDashoffset = "326.7256";
            }
        },
        [state, circleFill, volumeRing, analyser, analyzeData, maxTime]
    );

    const createWavBuffer = useCallback(async () => {
        if (!ctx.current) {
            ctx.current = new (window["AudioContext"] || window["webkitAudioContext" as any])();
        }
        if (!ctx.current) throw new Error("Failed to create audio context");

        await new Promise(resolve => setTimeout(resolve, 100));

        return chunksToMp3(chunks.current);
    }, [ctx, chunks]);

    const clearRecording = useCallback(() => {
        setState("inactive");
        chunks.current = [];
        averages.current = [];
        setCurrentDuration(0);
        if (recorder && recorder.state === "recording") recorder.stop();
        if (onReceiveBuffer) onReceiveBuffer(null);
    }, [recorder]);

    const playAudio = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.play();
        audioRef.current.addEventListener("ended", () => setIsPlaying(false));
        setIsPlaying(true);
    }, [audioRef]);

    const stopAudio = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
    }, [audioRef]);

    return (
        <div className="select-none md:w-2/3 mx-auto">
            <div className="flex flex-col gap-2 relative mx-auto text-center">
                {state === "no-device" && (
                    <div className="w-full h-full flex justify-center items-center">
                        <div className="w-36 h-36 rounded-full border border-white flex flex-col items-center justify-center gap-4 bg-gray-800">
                            {error ? (
                                <FaExclamationTriangle className="text-red-400 text-6xl" />
                            ) : (
                                <FaSync className="animate-spin text-4xl" />
                            )}
                        </div>
                    </div>
                )}
                {state === "inactive" && (
                    <div className="w-full h-full flex justify-center items-center">
                        <button
                            className="w-36 h-36 rounded-full border border-white flex flex-col items-center justify-center gap-4 bg-gray-800 leading-none"
                            onClick={startRecording}
                        >
                            <FaMicrophone className="text-6xl" />
                        </button>
                    </div>
                )}
                {state === "recording" && (
                    <div className="w-full h-full flex justify-center items-center">
                        <div className="w-36 h-36 relative" onClick={stopRecording}>
                            <svg className="progress-ring col-span-2" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="50"
                                    fill={
                                        state === "recording"
                                            ? "rgba(150,30,30,0.1)"
                                            : "transparent"
                                    }
                                    strokeWidth="1"
                                    stroke="rgba(255,255,255,0.1)"
                                    style={{
                                        transition: "all 0.2s",
                                    }}
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r={state === "recording" ? "16" : "8"}
                                    fill="rgba(150,30,30,1)"
                                    strokeWidth="1"
                                    stroke="transparent"
                                    style={{
                                        transition: "all 0.2s",
                                    }}
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="10"
                                    stroke="rgba(150,30,30,0.8)"
                                    strokeWidth="0.2"
                                    fill="rgba(150,30,30,0.1)"
                                    ref={volumeRing}
                                />
                                {maxTime != null && (
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="50"
                                        fill="transparent"
                                        strokeWidth="1"
                                        stroke="white"
                                        strokeDasharray="326.7256 326.7256"
                                        strokeDashoffset="326.7256"
                                        ref={circleFill}
                                        style={{
                                            transform: "rotate(-90deg)",
                                            transformOrigin: "50% 50%",
                                        }}
                                    />
                                )}
                            </svg>
                            <div className="w-full h-full absolute top-0 left-0 select-none grid place-items-center">
                                <p className="text-sm font-bold text-white text-opacity-70">
                                    {formatTime(currentDuration)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {state === "converting" && (
                    <div className="w-full h-full flex justify-center items-center">
                        <div className="h-36 w-36 border border-white border-opacity-20 rounded-full grid place-items-center">
                            <div className="relative flex justify-center">
                                <FaSync className="animate-spin text-4xl" />
                            </div>
                        </div>
                    </div>
                )}
                {state === "done" && (
                    <div className="w-full h-full flex justify-center items-center">
                        <div className="h-36 w-36 border border-white border-opacity-20 rounded-full grid place-items-center">
                            <div className="relative flex justify-center">
                                <FaCheck
                                    onClick={onFinished ? onFinished : undefined}
                                    className="cursor-pointer text-6xl"
                                />
                                <div className="absolute -bottom-5 flex gap-4">
                                    <FaTrash onClick={clearRecording} className="cursor-pointer" />
                                    {isPlaying && (
                                        <FaStop className="cursor-pointer" onClick={stopAudio} />
                                    )}
                                    {!isPlaying && (
                                        <FaPlay className="cursor-pointer" onClick={playAudio} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {error && <p className="text-red-300 text-center">{error}</p>}
                <audio controls={false} src={src} ref={audioRef} />
            </div>
        </div>
    );
};

export default AudioRecorder;

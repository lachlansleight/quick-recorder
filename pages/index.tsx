import { useCallback, useState } from "react";
import { FaCheck, FaSync, FaUpload } from "react-icons/fa";
import axios from "axios";
import AudioRecorder, { RecorderState } from "components/AudioRecorder";
import EnterWrapper from "components/layout/EnterWrapper";
import Layout from "components/layout/Layout";
import { getSpeechToText } from "lib/openai";

type FlowPhase = "recording" | "ready" | "uploading" | "uploaded";

const HomePage = (): JSX.Element => {
    const [file, setFile] = useState<File | null>(null);
    const [phase, setPhase] = useState<FlowPhase>("recording");
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const handleBuffer = (data: Blob | null) => {
        if (!data) {
            setFile(null);
            return;
        }
        setFile(new File([data], "audio.mp3", { type: "audio/mp3" }));
    };

    const doUpload = useCallback(async () => {
        if (!file) return;
        if (phase === "uploading") return;
        setPhase("uploading");
        const transcription = await getSpeechToText(file);
        await axios.post(`${process.env.NEXT_PUBLIC_FIREBASE_DATABASE}/recordings.json`, {
            text: transcription.text,
            startTimeUtc: startTime.toISOString(),
            durationMs: endTime.valueOf() - startTime.valueOf(),
        });
        setPhase("uploaded");
    }, [file]);

    const handleState = (state: RecorderState) => {
        if (state === "recording") setStartTime(new Date());
        if (state === "converting") setEndTime(new Date());
    };

    return (
        <Layout>
            <EnterWrapper>
                <div className="h-screen w-screen grid place-items-center">
                    <div className="w-screen flex flex-col items-center">
                        {phase === "recording" && (
                            <AudioRecorder
                                onReceiveBuffer={handleBuffer}
                                onRecordingStateChange={handleState}
                                onFinished={() => setPhase("ready")}
                            />
                        )}
                        {phase !== "recording" && (
                            <div className="h-36 w-36 border border-white border-opacity-20 rounded-full grid place-items-center">
                                {phase === "ready" &&
                                    (file ? (
                                        <FaUpload
                                            className="text-6xl cursor-pointer"
                                            onClick={doUpload}
                                        />
                                    ) : null)}
                                {phase === "uploading" && (
                                    <FaSync className="animate-spin text-4xl" />
                                )}
                                {phase === "uploaded" && (
                                    <FaCheck className="text-4xl text-green-400" />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </EnterWrapper>
        </Layout>
    );
};

export default HomePage;

/*
//Leaving this here so that I don't have to keep looking up the syntax...
import { GetServerSidePropsContext } from "next/types";
export async function getServerSideProps(ctx: GetServerSidePropsContext): Promise<{ props: any }> {
    return {
        props: {  },
    };
}
*/

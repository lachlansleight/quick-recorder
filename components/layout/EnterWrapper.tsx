import { ReactNode, useState } from "react";
import { FaDoorOpen } from "react-icons/fa";

const EnterWrapper = ({ children = null }: { children?: ReactNode }): JSX.Element => {
    const [entered, setEntered] = useState(false);

    if (!entered) {
        return (
            <div className="h-screen w-screen grid place-items-center">
                <div
                    className="h-36 w-36 border border-white border-opacity-20 rounded-full grid place-items-center cursor-pointer"
                    onClick={() => setEntered(true)}
                >
                    <FaDoorOpen className="text-6xl" />
                </div>
            </div>
        );
    }

    if (children) {
        return <>{children}</>;
    }

    return <></>;
};

export default EnterWrapper;

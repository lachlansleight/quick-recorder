import { ReactNode } from "react";
import Head from "next/head";

const Layout = ({ children }: { children: ReactNode }): JSX.Element => {
    return (
        <>
            <Head>
                <title>An Unnamed Space</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="min-h-screen">
                {children}
            </main>
        </>
    );
};

export default Layout;

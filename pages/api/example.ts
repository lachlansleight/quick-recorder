import { NextApiRequest, NextApiResponse } from "next";
import { NextRestApiRoute, RestError } from "lib/NextRestApiRoute";

const api = new NextRestApiRoute("/example");

api.get = async () => {
    throw new RestError("This is just a template endpoint - modify this GET block to make it do something!", 501);
};

export default (req: NextApiRequest, res: NextApiResponse) => api.handle(req, res);
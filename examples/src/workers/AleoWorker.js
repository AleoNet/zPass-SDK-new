import { createAleoWorker } from "zpass-sdk";

const AleoWorker = () => {
    return createAleoWorker({url: "worker.js", baseUrl: import.meta.url});
};

export { AleoWorker };
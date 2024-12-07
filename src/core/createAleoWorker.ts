import { wrap } from "comlink";

let singletonWorker: ReturnType<typeof wrap>;

interface CreateAleoWorkerOptions {
    url: string;
    baseUrl: string;
}

const createAleoWorker = ({url, baseUrl}: CreateAleoWorkerOptions) => {
    if (!singletonWorker) {
        const worker = new Worker(new URL(url, baseUrl), {
            type: "module",
        });

        worker.onerror = function(event) {
            console.error("Error in worker: " + event?.message);
        };

        singletonWorker = wrap(worker);
    }
    return singletonWorker;
};

export { createAleoWorker };
import axios, { AxiosError } from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 10000,
});

export interface ApiError {
    message: string;
    status?: number;
}

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; error?: string }>) => {
        let message = "Une erreur inattendue est survenue";

        if (error.response) {
            // Le serveur a répondu avec un statut d'erreur (4xx, 5xx)
            message = error.response.data?.message || message;
        } else if (error.request) {
            // La requête est partie mais aucune réponse reçue (serveur down, réseau coupé)
            message = "Impossible de contacter le serveur";
        }

        const normalizedError: ApiError = {
            message,
            status: error.response?.status,
        };

        return Promise.reject(normalizedError);
    }
);

export default api;
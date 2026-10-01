import "server-only";
import { parseQuranpediaReciters } from "../helpers/quranpedia-reciters";
import fetchQuranpedia from "./fetch-quranpedia";

export default async function getAvailableReciters() {
    return {
        reciters: parseQuranpediaReciters(
            await fetchQuranpedia("/v1/reciters"),
        ),
    };
}

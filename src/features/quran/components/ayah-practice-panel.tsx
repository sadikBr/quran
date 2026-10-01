"use client";

import { Eye, EyeOff, Pause, Play, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuranAudio } from "./quran-audio-provider";

export default function AyahPracticePanel({
    number,
    streams,
    children,
    onSave,
    saving,
    saved,
}: {
    number: number;
    streams: string[];
    children: ReactNode;
    onSave: () => void;
    saving: boolean;
    saved: boolean;
}) {
    const t = useTranslations("Reader.practice");
    const audioT = useTranslations("Reader.audio");
    const audio = useQuranAudio();
    const id = useId();
    const [tracks] = useState(() =>
        audio.getPracticeTracks({ ayahNumber: number, streams }),
    );
    const [end, setEnd] = useState(0);
    const [count, setCount] = useState(3);
    const [gap, setGap] = useState(2);
    const [hidden, setHidden] = useState(false);
    const active = tracks.find(
        (item) => item.track.ayahNumber === audio.activeAyahNumber,
    );
    const fieldClass =
        "mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm";
    return (
        <div className="space-y-4 pt-4">
            <p className="text-sm leading-6 text-muted-foreground">
                {t("description")}
            </p>
            <Button
                variant="outline"
                className="w-full"
                aria-expanded={!hidden}
                aria-controls={`${id}-verse`}
                onClick={() => setHidden((value) => !value)}
            >
                {hidden ? (
                    <Eye aria-hidden="true" />
                ) : (
                    <EyeOff aria-hidden="true" />
                )}
                {hidden ? t("reveal") : t("hide")}
            </Button>
            <div id={`${id}-verse`}>
                {hidden ? (
                    <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        {t("recallPrompt")}
                    </p>
                ) : (
                    children
                )}
            </div>
            <div className="grid grid-cols-2 gap-3">
                {tracks.length > 1 && (
                    <label className="col-span-2 text-xs font-semibold text-muted-foreground">
                        {t("rangeEnd")}
                        <select
                            className={fieldClass}
                            value={end}
                            onChange={(event) =>
                                setEnd(Number(event.target.value))
                            }
                        >
                            {tracks.map((item, index) => (
                                <option
                                    key={item.track.ayahNumber}
                                    value={index}
                                >
                                    {index === 0 ? t("thisAyah") : item.title}
                                </option>
                            ))}
                        </select>
                    </label>
                )}
                <label className="text-xs font-semibold text-muted-foreground">
                    {audioT("repeatCount")}
                    <select
                        className={fieldClass}
                        value={count}
                        onChange={(event) =>
                            setCount(Number(event.target.value))
                        }
                    >
                        {[1, 2, 3, 5, 10, 20].map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                    {audioT("gapSeconds")}
                    <select
                        className={fieldClass}
                        value={gap}
                        onChange={(event) => setGap(Number(event.target.value))}
                    >
                        {[0, 2, 5, 10, 15, 30].map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
            </div>
            {end > 0 && (
                <p className="text-xs leading-6 text-muted-foreground">
                    {t("rangeHint")}
                </p>
            )}
            <Button
                className="w-full"
                onClick={() =>
                    audio.startPractice(
                        tracks.slice(0, end + 1).map((item) => item.track),
                        { count, gap },
                    )
                }
            >
                <Play aria-hidden="true" />
                {audioT("startPractice")}
            </Button>
            {active && (
                <div className="rounded-xl bg-muted/40 p-3">
                    <output className="mb-2 block text-sm">
                        {audio.playbackStatus === "error"
                            ? t("playbackFailed")
                            : active.title}
                        <span className="mt-1 block text-xs text-muted-foreground">
                            {audio.playbackStatus === "loading"
                                ? audioT("loadingShort")
                                : audio.playbackStatus === "waiting"
                                  ? audioT("yourTurn")
                                  : audio.playbackStatus === "idle" &&
                                      audio.progress === 1
                                    ? audioT("finished")
                                    : audioT("repetition", {
                                          current: String(audio.repetition),
                                          total: String(audio.totalRepetitions),
                                      })}
                        </span>
                    </output>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            disabled={audio.playbackStatus === "loading"}
                            onClick={() =>
                                audio.playbackStatus === "error"
                                    ? audio.retryAudio()
                                    : audio.toggleAudio(
                                          active.track.ayahNumber as number,
                                          active.track.streams,
                                      )
                            }
                        >
                            {audio.isPlaying ? (
                                <Pause aria-hidden="true" />
                            ) : (
                                <Play aria-hidden="true" />
                            )}
                            {audio.playbackStatus === "error"
                                ? t("retry")
                                : audio.isPlaying
                                  ? t("pause")
                                  : t("play")}
                        </Button>
                        <Button variant="ghost" onClick={audio.stopAudio}>
                            <Square aria-hidden="true" />
                            {t("stop")}
                        </Button>
                    </div>
                </div>
            )}
            <Button
                variant="outline"
                className="w-full"
                disabled={saving || saved}
                onClick={onSave}
            >
                {saved ? t("saved") : t("save")}
            </Button>
        </div>
    );
}
